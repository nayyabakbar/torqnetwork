const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const User = require("../src/models/userSchema");

initializeApp({
  credential: applicationDefault(),
  projectId: "torqnetwork-309e8",
});

async function send(req, res) {
  try {
    const user = await User.findById(req.body.userId);
    const fcmToken = user.fcmToken;
    const username = req.body.name;

    const message = {
      notification: {
        title: "Time to mine!",
        body: `Your friend ${username} is remininding you to start your mining session`,
      },
      token: fcmToken,
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
