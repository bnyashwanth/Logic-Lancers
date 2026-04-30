const webpush = require('web-push');

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@smartrelief.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

/**
 * Send push notification to a user
 * @param {Object} user User model instance with pushSubscription
 * @param {Object} payload { title, body, icon, data: { sound, ... } }
 */
const sendPushNotification = async (user, payload) => {
  if (!user.pushSubscription) return;

  try {
    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify(payload)
    );
    console.log(`[PUSH] Notification sent to ${user.email}`);
  } catch (error) {
    console.error(`[PUSH ERROR] Failed for ${user.email}:`, error.message);
    if (error.statusCode === 410) {
      // Subscription expired or removed
      user.pushSubscription = null;
      await user.save();
    }
  }
};

module.exports = { sendPushNotification };
