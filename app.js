const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");
let dataBase = null;

const initializeDbAndServer = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server run at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db Error: ${e.message}`);
  }
};
initializeDbAndServer();

const convertDbRequestAndResponse = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictRequestToResponse = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const convertStateName = (dbValue) => {
  return {
    stateName: dbValue.state_name,
  };
};

//read statesList API1
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        SELECT * FROM state ORDER BY state_id;`;
  const statesArray = await dataBase.all(getStatesQuery);
  response.send(
    statesArray.map((eachObject) => convertDbRequestAndResponse(eachObject))
  );
});

//read state API2
app.get("/states/:stateId/", async (request, response) => {
  try {
    const { stateId } = request.params;
    const stateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
    const stateObject = await dataBase.get(stateQuery);
    response.send(convertDbRequestAndResponse(stateObject));
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
});

// add district API3
app.post("/districts/", async (request, response) => {
  try {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const addDistrictQuery = `
        INSERT INTO 
            district (district_name, state_id, cases, cured, active, deaths)
        VALUES('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;
    await dataBase.run(addDistrictQuery);
    response.send(`District Successfully Added`);
  } catch (e) {
    console.log(`error: ${e.message}`);
  }
});

//read district API4
app.get("/districts/:districtId/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const getDistrictQuery = `
            SELECT * FROM district WHERE district_id = ${districtId};`;
    const DbResponse = await dataBase.get(getDistrictQuery);
    response.send(convertDistrictRequestToResponse(DbResponse));
  } catch (e) {
    console.log(`error: ${e.message}`);
  }
});

//remove a district API5
app.delete("/districts/:districtId/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const removeDistrictQuery = `
            DELETE FROM district WHERE district_id = ${districtId};`;
    await dataBase.run(removeDistrictQuery);
    response.send(`District Removed`);
  } catch (e) {
    console.log(`error: ${e.message}`);
  }
});

//update a district API6
app.put("/districts/:districtId/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `
        UPDATE district
        SET
           district_name = '${districtName}',
           state_id = ${stateId},
           cases = ${cases},
           cured = ${cured},
           active = ${active},
           deaths = ${deaths}
        WHERE 
           district_id = ${districtId};`;
    await dataBase.run(updateDistrictQuery);
    response.send(`District Details Updated`);
  } catch (e) {
    console.log(`error: ${e.message}`);
  }
});

//read statstics API7
app.get("/states/:stateId/stats/", async (request, response) => {
  try {
    const { stateId } = request.params;
    const getStateDetailsQuery = `SELECT 
           district.SUM(cases) AS totalCases,
           district.SUM(cured) AS totalCured,
           district.SUM(active) AS totalActive,
           district.SUM(deaths) AS totalDeaths
        FROM 
           state NATURAL JOIN district 
        WHERE state.state_id = ${stateId}
        GROUP BY district_id;`;
    const stateDetails = await dataBase.get(getStateDetailsQuery);
    response.send(stateDetails);
  } catch (e) {
    console.log(`error: ${e.message}`);
  }
});

//API 8
app.get("/districts/:districtId/details/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const getResultQuery = `
            SELECT 
                state.state_name 
            FROM state NATURAL JOIN district
            WHERE district.district_id = ${districtId};`;
    const getStateName = await dataBase.get(getResultQuery);
    response.send(convertStateName(getStateName));
  } catch (e) {
    console.log(`error: ${e.message}`);
  }
});

module.exports = app;
