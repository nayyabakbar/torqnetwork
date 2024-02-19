const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const User = require("../src/models/userSchema");
const Notification = require("../src/models/notificationSchema");

initializeApp({
  credential: applicationDefault(),
  projectId: "torqnetwork-309e8",
});

async function send(req, res) {
  try {
    const receivingUser = await User.findById(req.body.userId);
    const senderUser = await User.findById(req.user.user);
    const fcmToken = receivingUser.fcmToken;
    const username = senderUser.name;
    const notificationMessage = {
      title: "Time to mine!",
      body: `Your friend ${username} is reminding you to start your mining session`,
    };
    const message = {
      notification: notificationMessage,
      token: fcmToken,
    };

    const response = await getMessaging().send(message);
    console.log("Successfully sent message:", response);

    const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}})
    await newNotification.save();

    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Error sending notification" });
  }
}



module.exports = {send}
