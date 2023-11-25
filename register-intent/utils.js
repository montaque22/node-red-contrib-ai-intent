const getErrorMessagesForConfig = (config) => {
  const { name, description } = config;
  if (!name) {
    return "Name is required";
  } else if (!description) {
    return "Description is required";
  }
};

module.exports = { getErrorMessagesForConfig };
