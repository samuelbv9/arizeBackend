const functions = require("firebase-functions");
const admin = require("firebase-admin");
const dateTime = require("node-datetime");
const {FB} = require("fb");
var firebase = require("firebase/app");
const auth = require("firebase/auth");
const firestore = require("firebase/firestore");

var firebaseConfig = {
  apiKey: "AIzaSyAdll3-ZXzgaVzvQLZ888T5FPIB7fMT-vA",
  authDomain: "arize-a5f7f.firebaseapp.com",
  databaseURL: "https://arize-a5f7f.firebaseio.com",
  projectId: "arize-a5f7f",
  storageBucket: "arize-a5f7f.appspot.com",
  messagingSenderId: "386892349044",
  appId: "1:386892349044:ios:730314bbaa3f2447c11b21",
};

admin.initializeApp();
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore()

exports.scheduledFunction = functions.pubsub.schedule("* * * * *")
    .onRun((context) => {
      console.log("This will be run every 1 minute!");
      filterImages();
    });

exports.scheduledFunction = functions.pubsub.schedule("59 23 * * 0-6")
    .onRun((context) => {
      console.log("This will be run every 1 minute!");
      getAnalytics()
    });

exports.test = functions.https.onRequest((req, res) => {
    getAnalytics()
      // getMediaInteractions("17841445742996683", "EAAEwl5JnSv8BAKGh6plokQL25uVuNgQqwrSgLpZALINDvkKpveKjTHJZBwsjE6HZCPViv21gCcAihiZByZCuxhhNBMvr0dGOLlxoe18Dduca9cIkW7LP7nJyMtuhwltEXsdPJMEo4uWJ8bJzpYyhykaO46qwp0tjqLXlahakbws0x5WhLefmbWSe6qd1JsZCkbm13pvVxisSDAofYSwc66HZCOdSSmdE791Yvg48ZCDJ4LdPAjY5qoEq")
      // getFollowers("17841445742996683", "EAAEwl5JnSv8BAKGh6plokQL25uVuNgQqwrSgLpZALINDvkKpveKjTHJZBwsjE6HZCPViv21gCcAihiZByZCuxhhNBMvr0dGOLlxoe18Dduca9cIkW7LP7nJyMtuhwltEXsdPJMEo4uWJ8bJzpYyhykaO46qwp0tjqLXlahakbws0x5WhLefmbWSe6qd1JsZCkbm13pvVxisSDAofYSwc66HZCOdSSmdE791Yvg48ZCDJ4LdPAjY5qoEq")
      res.send(200)
});

async function filterImages() {
  const imagesRef = admin.firestore().collection("images");
  const snapshot = await imagesRef.get();
  if (snapshot.empty) {
    console.log("no matching documents.");
    console.log("Something Went Wrong");
    return;
  } else {
    const date = dateTime.create().format("d-m-Y H:M");
    console.log(date);
    snapshot.forEach((doc) => {
      console.log(doc.id, "=>", doc.data());
      const publishTime = doc.data().publishTime;
      if (publishTime != null) {
        if (publishTime == date) {
          console.log("MATCH:", publishTime, " ", doc.id);
          const businessID = doc.data().businessID;
          const url = doc.data().imageURL;
          const token = doc.data().token;
          const caption = doc.data().caption;
          createContainer(businessID, url, token, caption);
        }
      }
    });
    console.log("Success");
  }
}

function createContainer(businessID, url, token, caption) {
  console.log("container created");
  FB.api(businessID + "/media?", "post", {
    image_url: url,
    caption: caption,
    access_token: token,
  }, function(res) {
    console.log(res.id);
    publishImage(res.id, businessID, token);
  });
}

function publishImage(containerID, businessID, token) {
  console.log("image posted");
  FB.api(businessID+"/media_publish?", "post", {
    creation_id: containerID,
    access_token: token,
  }, function(res) {
    console.log(res);
    return null;
  });
}









function getAnalytics() {
  db.collection("users").get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
        const docID = doc.id
        getFollowers(doc.data().businessID, doc.data().token, docID)
    });
});
}


//Can add parameter to specify lengh of impression we want
function getImpressions(businessID, token, docID) {
  FB.api(businessID+"/insights?", "get", {
    metric: ["impressions","reach","profile_views","website_clicks","email_contacts","get_directions_clicks", "phone_call_clicks","text_message_clicks"],
    period: "day",
    access_token: token,
  }, function(res) {
    console.log(res);
    const impressionsRef = db.collection("users").doc(docID).collection("analytics").doc(dateTime.create().format("d-m-Y"))
    const impressions = res.data[0].values[1].value
    const reach = res.data[1].values[1].value
    const profile_views = res.data[2].values[1].value
    const website_clicks = res.data[3].values[1].value
    const contact_clicks = res.data[4].values[1].value + res.data[5].values[1].value + res.data[6].values[1].value + res.data[7].values[1].value
    impressionsRef.update({
      impressions: impressions,
      reach: reach,
      profile_views: profile_views,
      website_clicks: website_clicks,
      contact_clicks: contact_clicks
    })
  });
  return null;
}

function getFollowers(businessID, token, docID) {
  FB.api(businessID+"?", "get", {
    fields: "followers_count",
    access_token: token,
  }, function(res) {
    console.log(res);
    const followers = res.followers_count
    console.log(followers);
    const impressionsRef = db.collection("users").doc(docID).collection("analytics").doc(dateTime.create().format("d-m-Y"))
    impressionsRef.set({
      followers: followers,
    })
  });
  getImpressions(businessID, token, docID)
}
