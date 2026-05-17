const sendSuccess = (res, data = null, message = 'İşlem başarılı', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

const sendError = (res, message = 'Sunucuda bir hata oluştu', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message
  });
};

module.exports = {
  sendSuccess,
  sendError
};
