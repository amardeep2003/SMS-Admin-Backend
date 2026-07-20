// import axios from "axios";

// export const sendOtpSms = async (mobile, otp) => {
//   console.log(otp,"sms service")

//   console.log(process.env.SMS_USERNAME)
//   console.log(process.env.SMS_API_KEY)
//   console.log(process.env.SMS_SENDER)
//   console.log(process.env.SMS_TYPE)
//   console.log(process.env.SMS_PEID)
//   console.log(process.env.SMS_TEMPLATE_ID)
//   console.log(process.env.SMS_BASE_URL)
//   // Local development
//   if (!process.env.SMS_BASE_URL) {
//     console.log(`
// =====================================
//         OTP SENT
// Phone : ${mobile}
// OTP   : ${otp}
// =====================================
// `);

//     return {
//       success: true,
//     };
//   }

//   try {
//     const message = `Dear User, Your OTP for password reset is ${otp}. It is valid for ${process.env.OTP_EXPIRE_MINUTES || 5} minutes. Please do not share this OTP with anyone. Regards Logixhunt`;

//     const response = await axios.get(process.env.SMS_BASE_URL, {
//       params: {
//         username: process.env.SMS_USERNAME,
//         message,
//         sendername: process.env.SMS_SENDER,
//         smstype: process.env.SMS_TYPE,
//         numbers: mobile,
//         apikey: process.env.SMS_API_KEY,
//         peid: process.env.SMS_PEID,
//         templateid: process.env.SMS_TEMPLATE_ID,
//       },
//     });

//     return response.data;
//   } catch (error) {
//     console.error("SMS Error:", error.response?.data || error.message);

//     throw new Error("Unable to send OTP.");
//   }
// };


import axios from "axios"

const sendOtpSms = async (mobile, otp) => {
  if (!process.env.SMS_BASE_URL) {
    // SMS not configured — log OTP to console for local dev/testing
    console.log(`[OTP] Phone: ${mobile} | Code: ${otp}`);
    return { success: true };
  }

  try {
    const message = `Dear User, Your OTP for login is ${otp} Valid for 20 mins, please do not share this OTP with anyone. Thanks & Regards Logixhunt`;

    const response = await axios.get(process.env.SMS_BASE_URL, {
      params: {
        username: process.env.SMS_USERNAME,
        message,
        sendername: process.env.SMS_SENDER,
        smstype: process.env.SMS_TYPE,
        numbers: mobile,
        apikey: process.env.SMS_API_KEY,
        peid: process.env.SMS_PEID,
        templateid: process.env.SMS_TEMPLATE_ID,
      },
    });

    return response.data;
  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    throw new Error("Unable to send OTP");
  }
};

export default sendOtpSms;