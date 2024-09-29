import React, { useState, useEffect } from "react";
import { gapi } from "gapi-script";
import { BOOLEAN_KEYWORDS } from "../components/helpers/types";

const API_KEY = "AIzaSyBzGmgHoBF4IijhwKDGibedlC-d3bg9Qw0";
const SHEET_ID = "1XXv0VAbyBmGy9n7qT9evqJB9KafSrtJ7kPDR6IBlLUg";
const SHEET_NAMES = ["FIRE", "WATER", "WIND", "EARTH", "DARK", "LIGHT"];
const ELEMENTS_PATH = `${process.env.PUBLIC_URL}/element_art/`;
const CARD_ART_PATH = `${process.env.PUBLIC_URL}/card_art/`;

const replaceElementImagePath = (effectText) => {
  // Replace element image paths
  effectText = effectText.replace(
    /\{Basic Elements\/(\w+)\.[Pp][Nn][Gg]\}/g,
    (match, element) => {
      const elementUppercase = element.toUpperCase();
      return `<img src="${ELEMENTS_PATH}${elementUppercase}.png" alt="${elementUppercase}" style="width: 20px; height: 20px; vertical-align: middle;" />`;
    }
  );

  // Add new line after "Must Special Summon"
  effectText = effectText.replace(/(Must Special Summon)/g, "$1<br />");

  // Add new line before boolean keywords followed by ":" or keywords followed by a number and an image
  BOOLEAN_KEYWORDS.forEach((keyword) => {
    // New line before keywords followed by ":"
    const keywordPattern = new RegExp(`([^"])(${keyword})(:)(?=\\s)`, "g");
    effectText = effectText.replace(keywordPattern, `$1<br />$2$3`);

    // New line before keywords followed by a number and an image
    const keywordWithNumberAndImagePattern = new RegExp(
      `([^"])(\\b${keyword}\\b)\\s+(\\d+)\\s*<img src="([^"]*)`,
      "g"
    );
    effectText = effectText.replace(keywordWithNumberAndImagePattern, `$1<br />$2 $3 <img src="$4`);

    // Handle "unique" separately, always add a new line
    if (keyword.toLowerCase() === "unique") {
      const uniquePattern = new RegExp(`(?!^)\\b${keyword}\\b`, "gi");
      effectText = effectText.replace(uniquePattern, `<br />${keyword}`);
    }
  });

  // Ensure no new lines are added before keywords inside quotes
  effectText = effectText.replace(/"(\s*<br \/>)?\s*(\b(?:Summon|Special|Double Strike|Void|Bounce|Discard|Freeze|Ranged|Mill|Grave|Hand|Crystalize|Flow|Heal|Charge|Link|Bubble|Generator)\b)/gi, `"$2`);

  // Add a new line before "If this Monster is Destroyed by your own effect"
  effectText = effectText.replace(/(^|\s)(If this Monster is Destroyed by your own effect)/g, `<br />$2`);

  return effectText;
};

const addCardArtPath = (card) => {
  const { Set, Id } = card;
  const cardIdPadded = Id.padStart(3, "0"); 
  card.cardArtPath = `${CARD_ART_PATH}${Set}-${cardIdPadded}.jpg`;
  return card;
};


const Database = () => {
  const [sheetData, setSheetData] = useState({});
  const [filters, setFilters] = useState({
    LVL: "All",
    Element: [],
    Atk: { min: 0, max: 10 },
    Health: { min: 0, max: 20 },
    Type: "All",
    Set: "All",
    Booleans: {},
  });

  const BOOLEAN_ATTRIBUTES = [
    "Summon",
    "Special",
    "Double Strike",
    "Void",
    "Bounce",
    "Discard",
    "Freeze",
    "Ranged",
    "Mill",
    "Grave",
    "Hand",
    "Unique",
    "Crystalize",
    "Flow",
    "Heal",
    "Charge",
    "Link",
    "Bubble",
    "Generator",
  ];

  const DISPLAY_ATTRIBUTES = [
    "Card Art",
    "Card Name",
    "LVL",
    "Element",
    "Attack",
    "Health",
    "Type",
    "Effect",
  ];

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
        return response.result.values || null;
      } catch (error) {
        console.error(`Error fetching data from ${sheetName}:`, error);
        return null;
      }
    };

    const results = await Promise.all(
      SHEET_NAMES.map((sheetName) => fetchSheetData(sheetName))
    );

    const sheetDataMap = SHEET_NAMES.reduce((acc, sheetName, index) => {
      const data = results[index];
      if (data) {
        const attributes = data[0];
        const objects = data.slice(1).map((row) => {
          const obj = {};
          attributes.forEach((attr, i) => {
            if (i >= 14 && i <= 35) {
              obj[attr] = row[i] === "Y";
            } else {
              obj[attr] = row[i] || "";
              if (attr === "Effect") {
                obj[attr] = replaceElementImagePath(row[i] || "");
              }
            }
          });
          obj.Element = sheetName;
          addCardArtPath(obj);
          return obj;
        });
        acc[sheetName] = objects;
      }
      return acc;
    }, {});

    console.log("Fetched and transformed sheet data:", sheetDataMap);
    setSheetData(sheetDataMap);
  };

  const handleDropdownChange = (attr, value) => {
    setFilters((prev) => ({ ...prev, [attr]: value }));
  };

  const handleElementFilter = (element) => {
    setFilters((prev) => {
      const newElements = prev.Element.includes(element)
        ? prev.Element.filter((el) => el !== element)
        : [...prev.Element, element];
      return { ...prev, Element: newElements };
    });
  };

  const handleRangeChange = (attr, min, max) => {
    setFilters((prev) => ({
      ...prev,
      [attr]: { min, max },
    }));
  };

  const handleBooleanFilter = (attr) => {
    setFilters((prev) => ({
      ...prev,
      Booleans: {
        ...prev.Booleans,
        [attr]: !prev.Booleans[attr],
      },
    }));
  };

  const filterData = (data) => {
    return data.filter((item) => {
      const lvlMatch = filters.LVL === "All" || item.LVL === filters.LVL;
      const elementMatch =
        filters.Element.length === 0 || filters.Element.includes(item.Element);
      const atkMatch =
        item.Attack >= filters.Atk.min && item.Attack <= filters.Atk.max;
      const healthMatch =
        item.Health >= filters.Health.min && item.Health <= filters.Health.max;
      const typeMatch = filters.Type === "All" || item.Type === filters.Type;
      const setMatch = filters.Set === "All" || item.Set === filters.Set;
      const booleanMatch = Object.keys(filters.Booleans).every((attr) => {
        return !filters.Booleans[attr] || item[attr];
      });

      return (
        lvlMatch &&
        elementMatch &&
        atkMatch &&
        healthMatch &&
        typeMatch &&
        setMatch &&
        booleanMatch
      );
    });
  };

  const combinedFilteredData = Object.values(sheetData)
    .flat()
    .filter((item) => filterData([item]).length > 0);

  const noCardsMessage =
    combinedFilteredData.length === 0 ? (
      <div style={{ textAlign: "left", padding: "20px" }}>
        No cards match the current filters.
      </div>
    ) : null;

  return (
    <div style={{ marginLeft: "100px", padding: "20px" }}>
      <h1>Luis Card Game Database</h1>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px" }}>
            LVL:{" "}
          </label>
          <select
            value={filters.LVL}
            onChange={(e) => handleDropdownChange("LVL", e.target.value)}
            style={{
              padding: "5px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          >
            <option value="All">All Levels</option>
            <option value="LV1">LV1</option>
            <option value="LV2">LV2</option>
            <option value="LV3">LV3</option>
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px" }}>
            Type:{" "}
          </label>
          <select
            value={filters.Type}
            onChange={(e) => handleDropdownChange("Type", e.target.value)}
            style={{
              padding: "5px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          >
            <option value="All">All Types</option>
            <option value="Beast">Beast</option>
            <option value="Demon">Demon</option>
            <option value="Hume">Hume</option>
            <option value="Dragon">Dragon</option>
            <option value="Spell">Spell</option>
            <option value="Relic">Relic</option>
          </select>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px" }}>
            Set:{" "}
          </label>
          <select
            value={filters.Set}
            onChange={(e) => handleDropdownChange("Set", e.target.value)}
            style={{
              padding: "5px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          >
            <option value="All">All Sets</option>
            <option value="BASE">BASE</option>
            <option value="SET2">SET2</option>
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px" }}>
            Attack:{" "}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={filters.Atk.min}
            onChange={(e) =>
              handleRangeChange("Atk", +e.target.value, filters.Atk.max)
            }
            style={{ marginRight: "5px" }}
          />
          <span>{filters.Atk.min}</span>
          <input
            type="range"
            min="0"
            max="10"
            value={filters.Atk.max}
            onChange={(e) =>
              handleRangeChange("Atk", filters.Atk.min, +e.target.value)
            }
            style={{ marginLeft: "5px", marginRight: "10px" }}
          />
          <span>{filters.Atk.max}</span>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px" }}>
            Health:{" "}
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={filters.Health.min}
            onChange={(e) =>
              handleRangeChange("Health", +e.target.value, filters.Health.max)
            }
            style={{ marginRight: "5px" }}
          />
          <span>{filters.Health.min}</span>
          <input
            type="range"
            min="0"
            max="20"
            value={filters.Health.max}
            onChange={(e) =>
              handleRangeChange("Health", filters.Health.min, +e.target.value)
            }
            style={{ marginLeft: "5px", marginRight: "10px" }}
          />
          <span>{filters.Health.max}</span>
        </div>

        <div style={{ marginRight: "15px", marginBottom: "15px" }}>
          <label>Element: </label>
          {SHEET_NAMES.map((element) => (
            <button
              key={element}
              onClick={() => handleElementFilter(element)}
              style={{
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                backgroundColor: filters.Element.includes(element)
                  ? "#b3e5fc"
                  : "#eceff1", // Light pastel blue if active, light gray otherwise
                cursor: "pointer",
                color: filters.Element.includes(element)
                  ? "#01579b"
                  : "#37474f", // Darker blue for active text, dark gray otherwise
                fontWeight: "bold",
              }}
            >
              {element}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {BOOLEAN_ATTRIBUTES.map((attr) => (
            <button
              key={attr}
              onClick={() => handleBooleanFilter(attr)}
              style={{
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                backgroundColor: filters.Booleans[attr] ? "#b3e5fc" : "#eceff1", // Light pastel blue if active, light gray otherwise
                cursor: "pointer",
                color: filters.Booleans[attr] ? "#01579b" : "#37474f", // Darker blue for active text, dark gray otherwise
                fontWeight: "bold",
              }}
            >
              {attr}
            </button>
          ))}
        </div>
      </div>

      <table
        style={{
          tableLayout: "auto",
          width: "90%",
          maxWidth: "1500px",
          borderCollapse: "collapse",
          padding: "10px",
        }}
      >
        <thead>
          <tr>
            {DISPLAY_ATTRIBUTES.map((attr) => (
              <th
                key={attr}
                style={{
                  borderBottom: "2px solid #ddd",
                  padding: "8px",
                  backgroundColor: "#f8f8f8",
                  textAlign: "left",
                  maxWidth: attr === "Effect" ? "none" : "150px",
                  minWidth: attr === "Card Name" ? "200px" : "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {attr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {combinedFilteredData.map((item, index) => (
            <tr
              key={`${item.Set}-${item.Id}`}
              style={{
                backgroundColor: index % 2 === 0 ? "#f2f2f2" : "#ffffff",
                borderBottom: "1px solid #ccc",
              }}
            >
              <td
                style={{
                  padding: "10px",
                  maxWidth: "150px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <img
                  src={item.cardArtPath}
                  alt={item["Card Name"]}
                  style={{
                    width: "100px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </td>
              <td
                style={{
                  padding: "10px",
                  maxWidth: "150px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item["Card Name"]}
              </td>
              <td
                style={{
                  padding: "10px",
                  maxWidth: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.LVL}
              </td>
              <td style={{ padding: "10px" }}>
                <img
                  src={`${ELEMENTS_PATH}${item.Element}.png`}
                  alt={item.Element}
                  style={{
                    width: "30px",
                    height: "30px",
                    verticalAlign: "middle",
                  }}
                />
              </td>
              <td
                style={{
                  padding: "10px",
                  maxWidth: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.Attack}
              </td>
              <td
                style={{
                  padding: "10px",
                  maxWidth: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.Health}
              </td>
              <td
                style={{
                  padding: "10px",
                  maxWidth: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.Type}
              </td>
              <td
                style={{ padding: "10px", overflow: "visible" }}
                dangerouslySetInnerHTML={{ __html: item.Effect }}
              ></td>{" "}
              {/* Allow Effect to take full width */}
            </tr>
          ))}
        </tbody>
      </table>

      {noCardsMessage}
    </div>
  );
};

export default Database;
