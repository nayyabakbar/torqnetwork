const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp({
  credential: applicationDefault(),
  projectId: "torqnetwork-309e8",
});

async function send(req, res) {
  try {
    const receivedToken = req.body.fcmToken;
    const message = {
      notification: {
        title: "Notification",
        body: "This is a test notification",
      },
      token: receivedToken,
    };

    const response = await getMessaging().send(message);
    console.log("Successfully sent message:", response);
    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Error sending notification" });
  }
}

module.exports = {send}
