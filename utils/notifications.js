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
    const {notificationType, data} = req.body
   
    var notificationMessage;
    if(notificationType == "ping"){
      notificationMessage = {
        title: "Time to mine!",
        body: `Your friend ${username} is reminding you to start your mining session`,
      };
    }

    else{
      notificationMessage = {
        title: "Congratulations!",
        body: `Your earned ${data} torq as bonus`,
        };
    }

    const message = {
      notification: notificationMessage,
      token: fcmToken,
    };

    if (receivingUser.enableNotification){
      const response = await getMessaging().send(message);
      console.log("Successfully sent message:", response);
    }

    const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}})
    await newNotification.save();

    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Error sending notification" });
  }
}

async function sendNotificationOnReferral(receiver,sender, type = "", bonus= 0){
  try {
    const receivingUser = await User.findById(receiver);
    const senderUser = await User.findById(sender);
    const fcmToken = receivingUser.fcmToken;
    const username = senderUser.name;
    var notificationMessage;

    if (type === "bonus"){
      notificationMessage = {
        title: `Congratulations! you just earned ${bonus}torq as bonus`,
        body: "5 people have joined from your invitation code",
      };
    }
    else {
      notificationMessage = {
        title: "Someone joined with your invitation Code!",
        body: ` ${username} just joined with your invitation Code!`,
      };
    }
    

    const message = {
      notification: notificationMessage,
      token: fcmToken,
    };

    if (receivingUser.enableNotification){
      const response = await getMessaging().send(message);
      console.log("Successfully sent message:", response);
    }

    
    const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}})
    await newNotification.save();
    return;

  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Error sending notification" });
  }
}

module.exports = {send, sendNotificationOnReferral}
