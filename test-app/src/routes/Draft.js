import React, { useState, useEffect } from "react";
import { gapi } from "gapi-script";

const API_KEY = "AIzaSyBzGmgHoBF4IijhwKDGibedlC-d3bg9Qw0";
const SHEET_ID = "1XXv0VAbyBmGy9n7qT9evqJB9KafSrtJ7kPDR6IBlLUg";
const SHEET_NAMES = ["FIRE", "WATER", "WIND", "EARTH", "DARK", "LIGHT"];
const TYPES = ["Beast", "Demon", "Hume", "Dragon", "Machine"];
const ELEMENTS_PATH = `${process.env.PUBLIC_URL}/element_art/`;
const CARD_ART_PATH = `${process.env.PUBLIC_URL}/card_art/`;

function getRandomOptions(array, count, exclude = []) {
  const available = array.filter((item) => !exclude.includes(item));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const Draft = () => {
  const [step, setStep] = useState(0);
  const [sheetData, setSheetData] = useState({});
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [currentChoices, setCurrentChoices] = useState([]);
  const [draftedCards, setDraftedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const MAX_CARDS = 50;

  useEffect(() => {
    const initClient = () => {
      gapi.client
        .init({
          apiKey: API_KEY,
          discoveryDocs: [
            "https://sheets.googleapis.com/$discovery/rest?version=v4",
          ],
        })
        .then(() => {
          loadSheetData();
        })
        .catch((err) => {
          console.error("Error initializing Google API client", err);
        });
    };

    gapi.load("client", initClient);
  }, []);

  const loadSheetData = async () => {
    const fetchSheetData = async (sheetName) => {
      try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetName,
        });
        return response.result.values || [];
      } catch (error) {
        console.error(`Error fetching data from ${sheetName}:`, error);
        return [];
      }
    };

    const results = await Promise.all(
      SHEET_NAMES.map((sheetName) => fetchSheetData(sheetName))
    );

    const dataMap = SHEET_NAMES.reduce((acc, sheetName, index) => {
      const data = results[index];
      if (data.length) {
        const attributes = data[0];
        const rows = data.slice(1).map((row) => {
          const card = {};
          attributes.forEach((attr, i) => {
            card[attr] = row[i] || "";
          });
          card.Element = sheetName;
          return card;
        });
        acc[sheetName] = rows;
      }
      return acc;
    }, {});

    setSheetData(dataMap);
    setLoading(false);
  };

  const handleStartDraft = () => {
    setStep(1);
    setDraftedCards([]);
    setSelectedElement(null);
    setSelectedType(null);
  };

  const handleSelectElement = (element) => {
    setSelectedElement(element);
    setStep(2);
  };

  const handleSelectType = (type) => {
    setSelectedType(type);
    generateNextChoices(selectedElement, type, []);
    setStep(3);
  };

  const generateNextChoices = (element, type, exclude = [], draftRound) => {
    const allCards = Object.values(sheetData).flat();
    const filteredCards = allCards.filter(
      (card) =>
        card.LVL === "LV3" &&
        card.Type !== "Relic" &&
        card.Type !== "Spell"
    );
  
    const elementCards = filteredCards.filter((card) => card.Element === element);
    const typeCards = filteredCards.filter((card) => card.Type === type);
    const randomCards = getRandomOptions(filteredCards, 2, exclude);
  
    let choices = [];
    if (draftRound === undefined) {
      draftRound = 0
    } 
    console.log(draftRound)
    if ([0, 24, 49].includes(draftRound)) {
      choices = [
        ...getRandomOptions(elementCards, 2, exclude),
        ...getRandomOptions(typeCards, 1, exclude),
        ...randomCards,
      ];
    } else {
      choices = [
        ...getRandomOptions(allCards.filter((card) => card.Element === element), 2, exclude),
        ...getRandomOptions(allCards.filter((card) => card.Type === type), 1, exclude),
        ...getRandomOptions(allCards, 2, exclude),
      ];
    }
  
    const uniqueChoices = [];
    const seen = new Set();
  
    const getUniqueCard = (cardList) => {
      let card = cardList.pop();
      while (seen.has(card["Card Name"])) {
        if (cardList.length === 0) break;
        card = cardList.pop();
      }
      return card;
    };
  
    const remainingChoices = [...choices];
    while (uniqueChoices.length < 5 && remainingChoices.length > 0) {
      const card = getUniqueCard(remainingChoices);
      if (!seen.has(card["Card Name"])) {
        seen.add(card["Card Name"]);
        uniqueChoices.push(card);
      }
    }
    while (uniqueChoices.length < 5) {
      const additionalCards = getRandomOptions(filteredCards, 5 - uniqueChoices.length, exclude);
      additionalCards.forEach((card) => {
        if (!seen.has(card["Card Name"])) {
          seen.add(card["Card Name"]);
          uniqueChoices.push(card);
        }
      });
    }
  
    setCurrentChoices(uniqueChoices);
  };  
  

  const handleChooseCard = (card) => {
    const updatedCards = [...draftedCards, card];
    const newDraftRound = updatedCards.length;
  
    setDraftedCards(updatedCards);
    if (newDraftRound < MAX_CARDS) {
      generateNextChoices(selectedElement, selectedType, currentChoices, newDraftRound);
    } else {
      setStep(4);
    }
  };
  
  
  const renderCard = (card, index) => (
    <div
      key={`${card["Card Name"]}-${index}`}
      style={{
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
        margin: "10px",
        textAlign: "center",
        width: "200px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h4>Option {index + 1}</h4>
      <img
        src={`${CARD_ART_PATH}${card.Set}-${card.Id}.jpg`}
        alt={card["Card Name"]}
        style={{
          width: "100%",
          borderRadius: "4px",
          marginBottom: "10px",
          border: "1px solid #ddd",
        }}
      />
      <h4>{card["Card Name"]}</h4>
      {card.Type !== "Relic" && card.Type !== "Spell" && (
        <>
          <p>Attack: {card.Attack}</p>
          <p>Health: {card.Health}</p>
        </>
      )}
      <button
        onClick={() => handleChooseCard(card)}
        style={{
          marginTop: "10px",
          padding: "5px 10px",
          backgroundColor: "#4caf50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Choose
      </button>
    </div>
  );

  const renderDraftedList = () => (
    <div style={{ marginBottom: "20px", fontSize: "0.9rem", textAlign: "left" }}>
      <h4>Drafted Cards:</h4>
      <ul>
        {draftedCards.map((card, index) => (
          <li key={index}>{card["Card Name"]}</li>
        ))}
      </ul>
    </div>
  );

  const roundNumber = draftedCards.length + 1;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      {step === 0 && (
        <button onClick={handleStartDraft} style={startButtonStyle}>
          Start New Draft
        </button>
      )}

      {step === 1 && (
        <div>
          <h2>Select an Element</h2>
          {getRandomOptions(SHEET_NAMES, 3).map((element) => (
            <button
              key={element}
              onClick={() => handleSelectElement(element)}
              style={largeButtonStyle}
            >
              {element}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Select a Type</h2>
          {getRandomOptions(TYPES, 3).map((type) => (
            <button
              key={type}
              onClick={() => handleSelectType(type)}
              style={largeButtonStyle}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {step >= 3 && step < 4 && (
        <div>
          <h2>Round {roundNumber}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
            {currentChoices.map((card, index) => renderCard(card, index))}
          </div>
          {renderDraftedList()}
        </div>
      )}

      {step === 4 && (
        <div>
          <h2>Draft Complete!</h2>
          {renderDraftedList()}
          <button onClick={handleStartDraft} style={startButtonStyle}>
            Draft Again
          </button>
        </div>
      )}
    </div>
  );
};

const startButtonStyle = {
  padding: "20px 40px",
  fontSize: "1.5rem",
  backgroundColor: "#2196F3",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
};

const largeButtonStyle = {
  margin: "10px",
  padding: "10px 20px",
  fontSize: "1.2rem",
  backgroundColor: "#FF9800",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
};

export default Draft;
