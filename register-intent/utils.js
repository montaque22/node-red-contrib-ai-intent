const getErrorMessagesForConfig = (config) => {
  const { intentId, aiDescription, confirmationMessage, requireConfirmation } =
    config;
  if (!intentId) {
    return "Missing intent id";
  } else if (!aiDescription) {
    return "Missing AI Description";
  } else if (requireConfirmation && !confirmationMessage) {
    return "Must provide confirmation message if require confirmation is true";
  }
};

module.exports = { getErrorMessagesForConfig };
