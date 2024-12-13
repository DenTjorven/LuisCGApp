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
  const [selectedElements, setSelectedElements] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [currentChoices, setCurrentChoices] = useState([]);
  const [draftedCards, setDraftedCards] = useState([]);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const MAX_CARDS = 45;

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
    setSelectedElements([]);
    setSelectedType(null);
    setRound(0);
  };

  const handleSelectElement = (element) => {
    if (selectedElements.includes(element)) return;

    const updatedElements = [...selectedElements, element];
    setSelectedElements(updatedElements);

    if (updatedElements.length < 2) {
      setStep(1);
    } else {
      setStep(2);
    }
  };

  const handleSelectType = (type) => {
    setSelectedType(type);
    generateNextChoices(selectedElements[0], type, [], 0);
    setStep(3);
  };

  const generateNextChoices = (element, type, exclude = [], nextRound) => {
    const allCards = Object.values(sheetData).flat();
    const specialPickRounds = [0, 23, 45];
    const isSpecialPick = specialPickRounds.includes(nextRound);
  
    // Function to filter cards
    const filterCards = (criteria) => {
      return allCards.filter(
        (card) =>
          criteria(card) &&
          (!isSpecialPick || (card.LVL === "LV3" && card.Type !== "Relic" && card.Type !== "Spell"))
      );
    };
  
    // Filter pools
    const elementCards = filterCards((card) => card.Element === element);
    const typeCards = filterCards((card) => card.Type === type);
    const randomCards = getRandomOptions(filterCards(() => true), 2, exclude);
  
    let choices = [];

      
  console.log(round);
  console.log(nextRound)
  console.log(element);
  console.log(elementCards);
  console.log(typeCards);
  console.log(randomCards);
  
    if (isSpecialPick) {
      // Special pick uses the same pools with restrictions
      choices = [
        ...getRandomOptions(elementCards, 2, exclude).map((card) => ({
          ...card,
          pool: "element",
        })),
        ...getRandomOptions(typeCards, 1, exclude).map((card) => ({
          ...card,
          pool: "type",
        })),
        ...randomCards.map((card) => ({
          ...card,
          pool: "random",
        })),
      ];
    } else if (round < 23) {
      // Standard picks (first 23 rounds)
      choices = [
        ...getRandomOptions(elementCards, 2, exclude).map((card) => ({
          ...card,
          pool: "element",
        })),
        ...getRandomOptions(typeCards, 1, exclude).map((card) => ({
          ...card,
          pool: "type",
        })),
        ...randomCards.map((card) => ({
          ...card,
          pool: "random",
        })),
      ];
    } else {
      // Standard picks (after round 23)
      const secondElementCards = filterCards(
        (card) => card.Element === selectedElements[1]
      );
      choices = [
        ...getRandomOptions(secondElementCards, 2, exclude).map((card) => ({
          ...card,
          pool: "element",
        })),
        ...getRandomOptions(typeCards, 1, exclude).map((card) => ({
          ...card,
          pool: "type",
        })),
        ...randomCards.map((card) => ({
          ...card,
          pool: "random",
        })),
      ];
    }
  
    // Remove duplicates while keeping track of the pool
    const seen = new Set();
    const uniqueChoices = choices.filter((card) => {
      if (!seen.has(card["Card Name"])) {
        seen.add(card["Card Name"]);
        return true;
      }
      return false;
    });
  
    // Fill choices if fewer than 5 remain
    while (uniqueChoices.length < 5) {
      const missingPool = uniqueChoices.length % 3 === 0 ? "element" : uniqueChoices.length % 3 === 1 ? "type" : "random";
      const additionalCards = getRandomOptions(
        allCards.filter(
          (card) =>
            !seen.has(card["Card Name"]) &&
            (!isSpecialPick || (card.LVL === "LV3" && card.Type !== "Relic" && card.Type !== "Spell")) &&
            ((missingPool === "element" && card.Element === element) ||
              (missingPool === "type" && card.Type === type) ||
              missingPool === "random")
        ),
        1,
        exclude
      ).map((card) => ({
        ...card,
        pool: missingPool,
      }));
  
      uniqueChoices.push(...additionalCards);
    }
  
    console.log("Unique Choices generated:", uniqueChoices);
    setCurrentChoices(uniqueChoices);
  };
  
  const handleChooseCard = (card) => {
    setDraftedCards((prevDraftedCards) => [...prevDraftedCards, card]);
  
    setRound((prevRound) => {
      const nextRound = prevRound + 1
  
      if (nextRound < MAX_CARDS) {
        console.log(nextRound)
        generateNextChoices(
          nextRound < 23 ? selectedElements[0] : selectedElements[1],
          selectedType,
          currentChoices,
          nextRound + 1
        );
      } else {
        setStep(4); // Final review step
      }
  
      return nextRound; // Update round
    });
  };  

  const renderCard = (card, index) => (
    <div key={`${card["Card Name"]}-${index}`} style={{
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "8px",
      boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
      margin: "10px",
      textAlign: "center",
      width: "200px",
      backgroundColor: "#f9f9f9",
    }}>
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
      <p>Attack: {card.Attack}</p>
      <p>Health: {card.Health}</p>
      <button onClick={() => handleChooseCard(card)} style={largeButtonStyle}>
        Choose
      </button>
    </div>
  );
  
  const renderDraftedList = () => {
    const cardCounts = draftedCards.reduce((acc, card) => {
      const key = `${card["Card Name"]} (${card.Element})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  
    return (
      <div>
        <h4>Drafted Cards:</h4>
        <ul>
          {Object.entries(cardCounts).map(([key, count], index) => (
            <li key={index}>{`${key} x${count}`}</li>
          ))}
        </ul>
      </div>
    );
  };  

  const roundNumber = draftedCards.length + 1;
  const availableElements = SHEET_NAMES.filter((el) => !selectedElements.includes(el));

  if (loading) return <div>Loading...</div>;

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
          {getRandomOptions(availableElements, 3).map((element) => (
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
          {getRandomOptions(TYPES, 2).map((type) => (
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
