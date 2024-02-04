const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const AppleStrategy = require("passport-apple").Strategy;
const User = require("../src/models/userSchema");
const jwt = require("jsonwebtoken");
const secretKey = require("./secret");
const { hashSync, compareSync } = require("bcrypt");
const crypto = require("crypto");
const QrCode = require("qrcode");
const fs = require("fs").promises;
const path = require("path");

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(async (_id, done) => {
  try {
    const user = await User.findById(_id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
      scope:['profile','email']
    },
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          console.log("User found:", user);
        } else {
          user = await User.findOne({ email: profile.email });

          if (user) {
            user.googleId = profile.id;
            await user.save();
          } else {
            const newUser = new User({
              googleId: profile.id,
              email: profile.email,
              name: profile.displayName,
              password: hashSync(profile.displayName, 10),
            });
            await newUser.save();
            const userInvitationCode = crypto.randomBytes(10).toString("hex");
            const qrCodeDirectory = "public/qrCodes";
            const imagePath = path.join(
              qrCodeDirectory,
              `${newUser._id}_qr.png`
            );
            await fs.mkdir(path.join(qrCodeDirectory), { recursive: true });
            const generateCode = await QrCode.toFile(
              imagePath,
              userInvitationCode
            );
            const savedUser = await User.findByIdAndUpdate(
              newUser._id,
              {
                $set: {
                  qrCodePath: imagePath,
                  invitationCode: userInvitationCode,
                },
              },
              { new: true }
            );

            user = newUser;
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["emails", "displayName", "name", "picture"],
    },

    function (request, accessToken, refreshToken, profile, done) {
      console.log(profile);
      return done(null, profile);
      // User.findOrCreate({ googleId: profile.id }, function (err, user) {
      //   return done(err, user);
      // });
    }
  )
);
