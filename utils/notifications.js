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

      const latestNotification = await Notification.findOne({senderId: senderUser._id, receiverId: req.body.userId, notificationType: "ping"}).sort({createdAt: -1});
      if (latestNotification){
        const currentDate = Date.now();
        const timeDifference = currentDate - latestNotification.createdAt
        if (timeDifference < 24 * 60 * 60 * 1000){
          return res.status(403).json({
          message: "You can only ping once in 24 hours"
        })
      }
      }

      notificationMessage = {
        title: "Time to mine!",
        body: `Your friend ${username} is reminding you to start your mining session`,
      };

      const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "ping"})
      await newNotification.save();
    }

    else{
      notificationMessage = {
        title: "Congratulations!",
        body: `Your mining rate increased by ${data}% torq from spinning bonus wheel`,
        };

        const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "bonusWheel"})
        await newNotification.save();
    }

    const message = {
      notification: notificationMessage,
      token: fcmToken,
    };
    if (receivingUser.enableNotification){
      const response = await getMessaging().send(message);
    }

    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Error sending notification" });
  }
}


async function sendToAll(req, res) {
  try {
    const { receivers } = req.body;
    const senderUser = await User.findById(req.user.user);
    const username = senderUser.name;
    
    const templateNotification = {
        senderId: senderUser._id,
        receiverId: "",
        notificationType: "pingAll",
        createdAt: Date.now()
    }
    
    const latestNotification = await Notification.findOne({senderId: senderUser._id, notificationType: "pingAll"}).sort({createdAt: -1});
    if (latestNotification){
        const currentDate = Date.now();
        const timeDifference = currentDate - latestNotification.createdAt
        if (timeDifference < 24 * 60 * 60 * 1000){
          return res.status(403).json({
          message: "You can only ping once in 24 hours"
        })
      }
    }

    for (const item of receivers) {
      const user = await User.findById(item);
      const userToken = user.fcmToken;

      if (!user) {
        console.error(`User with id ${item} not found`);
        continue; // Skip to the next iteration if user is not found
      }

      const notificationMessage = {
        title: "Time to mine!",
        body: `Your friend ${username} is reminding you to start your mining session`,
      };

      const newNotification = new Notification(templateNotification);
      newNotification.receiverId = item
      await newNotification.save();

      const message = {
        notification: notificationMessage,
        token: userToken,
      };
      if (user.enableNotification) {
        const response = await getMessaging().send(message);
        console.log("Notification sent successfully to user:", user._id);
      } else {
        console.log("User has disabled notifications:", user._id);
      }
    }

    res.status(200).json({ message: "Notifications sent successfully" });
  
  } catch (error) {
    console.error("Error sending notifications:", error);
    res.status(500).json({ error: "Error sending notifications" });
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
        title: "You just completed a task to level up",
        body: `You are rewarded ${bonus} torq because 5 people have joined from your invitation code`,
      };
      const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "invitedFriends"})
      await newNotification.save();
      
    }
    else {
      notificationMessage = {
        title: "Someone joined with your invitation Code!",
        body: ` ${username} just joined with your invitation Code!`,
      };

      const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "invitationCode"})
      await newNotification.save();
    }
    

    const message = {
      notification: notificationMessage,
      token: fcmToken,
    };

    if (receivingUser.enableNotification){
      const response = await getMessaging().send(message);
      console.log("Successfully sent message:", response);
    }

    return;

  } catch (error) {
    console.error("Error sending message:", error);
    
  }
}

async function sendNotificationOnProgress(receiver,sender, type = "", bonus= 0){
  try {
    const receivingUser = await User.findById(receiver);
    const senderUser = await User.findById(sender);
    const fcmToken = receivingUser.fcmToken;
    var notificationMessage;

    if (type === "earning"){
      notificationMessage = {
        title: "You just completed a task to level up",
        body: `You are rewarded ${bonus} torq upon starting your earning on Torqnetwork`,
      };

      const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "startedEarning"})
      await newNotification.save();
    }
    else if (type === "photo"){
      notificationMessage = {
        title: "You just completed a task to level up",
        body: `You are rewarded ${bonus} torq upon adding your photo`,
      };
      const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "addedPhoto"})
      await newNotification.save();
    }
    else if (type === "twitter"){
      notificationMessage = {
        title: "You just completed a task to level up",
        body: `You are rewarded ${bonus} torq upon following us on twitter`,
      };
      const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "addedTwitter"})
      await newNotification.save();
    }
    else if (type === "telegram"){
      notificationMessage = {
        title: "You just completed a task to level up",
        body: `You are rewarded ${bonus} torq upon following us on telegram`,
      };
      const newNotification = new Notification({senderId: senderUser._id, receiverId: receivingUser._id, message: {title: notificationMessage.title, body: notificationMessage.body}, notificationType: "addedTelegram"})
      await newNotification.save();
    }
    

    const message = {
      notification: notificationMessage,
      token: fcmToken,
    };

    if (receivingUser.enableNotification){
      const response = await getMessaging().send(message);
      console.log("Successfully sent message:", response);
    }
    return;

  } catch (error) {
    console.error("Error sending message:", error);
    
  }
}

module.exports = {send, sendNotificationOnReferral, sendNotificationOnProgress, sendToAll}
