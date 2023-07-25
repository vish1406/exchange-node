import { Curl } from "node-libcurl";
import Sport from "../../models/v1/Sport.js";
import Competition from "../../models/v1/Competition.js";
import Event from "../../models/v1/Event.js";

const BASE_URL = "http://3.6.84.17/exchange/api.php";

//Sync all APIs for Sports, Competitions, Events
const syncDetail = async (req, res) => {
  try {
    // Call the syncSports function to sync sports data
    await syncSports();
    console.log("All Sports has been synced");

    // Call the syncCompetition function to sync competition data
    await syncCompetition();
    console.log("All Competitions has been synced");

    // Call the syncEvent function to sync Event data
    await syncEvents();
    console.log("All Events has been synced");

    // Respond with a 200 status code and success message
    res.status(200).json({ message: "All data has been synced!" });
  } catch (e) {
    // Handle any errors that occurred during the sync process
    res.status(500).json({ error: "An error occurred" });
  }
};

// Common Function to Sync Sports
async function syncSports() {
  // Construct the URL to fetch sports data from the API
  var url = `${BASE_URL}?action=sports`;

  // Fetch sports data from the API using the fetchData function
  const { statusCode, data } = await fetchData(url);

  // Check if the API request was successful (status code 200)
  if (statusCode === 200) {
    // Loop through each sport object in the data array
    for (const sport of data) {
      // Query the database to find if the sport already exists using its apiSportId
      var checkSport = await Sport.findOne({
        apiSportId: Number(sport.eventType),
      });

      // If the sport does not exist in the database, add it
      if (!checkSport) {
        // Create a new sport data object to be saved in the database
        const sportData = {
          name: sport.name,
          apiSportId: Number(sport.eventType),
        };

        // Create a new Sport document with the sportData and save it in the database
        var sportInfo = new Sport(sportData);
        await sportInfo.save();
      }
    }
  }
}

// Function to sync competitions with the database
async function syncCompetition() {
  // Fetch all sports that have a valid apiSportId
  var allSports = await Sport.find({ apiSportId: { $ne: null } });

  // Iterate through each sport to fetch competitions for it
  for (const sport of allSports) {
    // Construct the URL to fetch competitions data for the current sport
    var competitionUrl = `${BASE_URL}?action=serise&sport_id=${sport.apiSportId}`;

    // Fetch competitions data from the API for the current sport
    const { statusCode, data } = await fetchData(competitionUrl);

    // Check if the API request was successful (status code 200)
    if (statusCode === 200) {
      // Iterate through each competition data for the current sport
      for (const competition of data) {
        // Prepare the competition object to be saved in the database
        const competitionObj = {
          name: competition.competition.name,
          sportId: sport._id,
          apiSportId: sport.apiSportId,
          apiCompetitionId: competition.competition.id,
          marketCount: competition.marketCount,
          competitionRegion: competition.competitionRegion,
          isActive: true,
        };

        // Find the competition based on apiSportId and apiCompetitionId
        // Update it if exists or create a new entry (upsert: true)
        await Competition.findOneAndUpdate(
          {
            apiSportId: sport.apiSportId,
            apiCompetitionId: competition.competition.id,
          },
          { $set: competitionObj }, // Set the competitionObj properties
          { new: true, upsert: true } // Create new entry if not found
        );
      }
    }
  }
}

// Function to sync events with the database
async function syncEvents() {
  // Fetch all competitions that have a valid apiCompetitionId
  var allCompetition = await Competition.find({
    apiCompetitionId: { $ne: null },
  });

  // Iterate through each competition to fetch events for it
  for (const competition of allCompetition) {
    // Construct the URL to fetch events data for the current competition
    var eventUrl = `${BASE_URL}?action=event&sport_id=${competition.apiSportId}&competition_id=${competition.apiCompetitionId}`;

    // Fetch events data from the API for the current competition
    const { statusCode, data } = await fetchData(eventUrl);

    // Check if the API request was successful (status code 200)
    if (statusCode === 200) {
      // Iterate through each event data for the current competition
      for (const event of data) {
        // Prepare the event object to be saved in the database
        const eventObj = {
          name: event.event.name,
          sportId: competition.sportId,
          apiSportId: competition.apiSportId,
          competitionId: competition._id,
          apiCompetitionId: competition.apiCompetitionId,
          apiEventId: event.event.id,
          matchDate: event.event.openDate,
          marketCount: event.marketCount,
        };

        // Find the event based on apiEventId
        // Update it if exists or create a new entry (upsert: true)
        await Event.findOneAndUpdate(
          {
            apiEventId: event.event.id,
            apiSportId: competition.apiSportId,
            apiCompetitionId: competition.apiCompetitionId,
          },
          { $set: eventObj }, // Set the eventObj properties
          { new: true, upsert: true } // Create new entry if not found
        );
      }
    }
  }
}

// Common function to make CURL request to any URL
async function fetchData(url) {
  const curl = new Curl();
  curl.setOpt(Curl.option.URL, url);
  curl.setOpt(Curl.option.HTTPGET, 1);

  return new Promise((resolve, reject) => {
    curl.on("end", (statusCode, body) => {
      // Parse the response body into a JavaScript object
      const parsedData = JSON.parse(body);

      // Resolve the promise with the parsed data and the status code
      resolve({ statusCode, data: parsedData });
    });

    curl.on("error", (error) => {
      reject(error);
    });

    curl.perform();
  }).finally(() => {
    curl.close();
  });
}

export default {
  syncDetail,
};