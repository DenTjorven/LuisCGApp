// src/routes/database.js
import React, { useState, useEffect } from 'react';
import { gapi } from 'gapi-script';
import { ATTRIBUTES, BOOLEAN_ATTRIBUTES } from '../components/helpers/types';

const API_KEY = 'AIzaSyBzGmgHoBF4IijhwKDGibedlC-d3bg9Qw0';
const SHEET_ID = '1XXv0VAbyBmGy9n7qT9evqJB9KafSrtJ7kPDR6IBlLUg';
const SHEET_NAMES = ['FIRE', 'WATER', 'WIND', 'EARTH', 'DARK', 'LIGHT'];

const Database = () => {
  const [sheetData, setSheetData] = useState({});
  const [error, setError] = useState(null); // Capture errors

  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      }).then(() => {
        loadSheetData();
      }).catch(err => {
        console.error("Error initializing Google API client", err);
        setError("Failed to initialize Google API client");
      });
    };

    gapi.load('client', initClient);
  }, []);

  const loadSheetData = async () => {
    const fetchSheetData = async (sheetName) => {
      try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetName,
        });
        return response.result.values || null; // If sheet has no data, return null
      } catch (error) {
        console.error(`Error fetching data from ${sheetName}:`, error);
        return null; // If sheet doesn't exist or another error occurs
      }
    };
  
    const results = await Promise.all(
      SHEET_NAMES.map((sheetName) => fetchSheetData(sheetName))
    );
  
    const sheetDataMap = SHEET_NAMES.reduce((acc, sheetName, index) => {
      const data = results[index];
      if (data) {
        const attributes = data[0]; // First row is the attributes
        const objects = data.slice(1).map((row) => {
          const obj = {};
          attributes.forEach((attr, i) => {
            // Check if the attribute is boolean based on the original indices you provided
            if (i >= 14 && i <= 35) {
              // From the 15th index onward (0-based) for Y/N attributes
              obj[attr] = row[i] === 'Y'; // Convert 'Y' to true, 'N' to false
            } else {
              // For all other attributes
              obj[attr] = row[i] || ''; // Assign the value or empty string
            }
          });
          obj.Element = sheetName; // Override Element with the sheet name
          return obj;
        });
        acc[sheetName] = objects; // Store processed objects under the respective sheet name
      }
      return acc;
    }, {});
  
    console.log('Fetched and transformed sheet data:', sheetDataMap);
    setSheetData(sheetDataMap);
  };
  

  return (
    <div style={{ marginLeft: '100px', padding: '20px' }}>
      <h1>Google Sheets Data</h1>
      {SHEET_NAMES.map((sheetName) => (
        <div key={sheetName}>
          <h2>{sheetName} Data:</h2>
          {sheetData[sheetName] && sheetData[sheetName].length > 0 ? (
            <table>
              <thead>
                <tr>
                  {ATTRIBUTES.map((heading, index) => (
                    <th key={index}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetData[sheetName].map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {ATTRIBUTES.map((attr, cellIndex) => (
                      <td key={cellIndex}>{row[attr]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No data available for {sheetName}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default Database;
