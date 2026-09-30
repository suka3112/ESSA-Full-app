import fs from "fs";
import path from "path";
import crypto from "crypto";
import Handlebars from "handlebars";
import fspromise from "fs/promises";
import mail from "../utils/mail";
import { BaseController } from "../controllers/baseController";
import otpAuthenticattion from "../utils/Authenticattion";
import { User } from "../models/user";
import {
  convertToSequalizeDateTime,
  generateCSV,
  generateCSVForSOA,
} from "./globalFunction";
import { APIError } from "./apiError.utils";
import axios from "axios";
import { fetchEmailAttachments } from "../utils/globalFunction";
import { InviteVendor } from "../models/inviteVendor";
import { Entity } from "../models/entity";
import { User_Otp } from "../models/userOtp";
import logger from "../utils/logger";

class ConstructMail extends BaseController {
  async ApplicationApproval(
    email: string,
    password: string,
    name: any,
    instagram: string,
    facebook: string,
    linkedIn: string,
    twitter: string,
    youtube: string,
  ) {
    try {
      const emailData = {
        email: email,
        password: password, // This need to be updated for the correct path for validating the otp
        vendorName: name,
        registrationLink: process.env.FE_URL,
        instagram: instagram,
        facebook: facebook,
        linkedIn: linkedIn,
        twitter: twitter,
        youtube: youtube,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendorCred.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      await mail.sendEmail(
        email, // Recipient
        "Vendor Registration Approved", // Subject
        htmlToSend, // Compiled HTML content
      );
      return { status: true, data: "email sent" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async NewApplicationApproval(
    email: string,
    password: string,
    name: any,
    instagram: string,
    facebook: string,
    linkedIn: string,
    twitter: string,
    youtube: string,
  ) {
    try {
      const emailData = {
        email: email,
        password: password, // This need to be updated for the correct path for validating the otp
        vendorName: name,
        registrationLink: process.env.FE_URL,
        instagram: instagram,
        facebook: facebook,
        linkedIn: linkedIn,
        twitter: twitter,
        youtube: youtube,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendorAdditionalCred.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      await mail.sendEmail(
        email,
        "Vendor Portal - New User Added Successfully",
        htmlToSend,
      );
      return { status: true, data: "email sent" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async registrationMailBuild(vendorData: any) {
    try {
      let expiry = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
      let otp = await otpAuthenticattion.generateAndStoreOTP(
        vendorData?.Email,
        expiry,
      );

      let link = await Entity.findOne({
        where: { CoCd: vendorData?.CoCd },
        attributes: [
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
        raw: true,
      });

      const emailData = {
        otp: otp,
        registrationLink: `${process.env.WEBFORM_LINK}?email=${vendorData?.Email}&cr_person_id=${vendorData?.CR_Person_Id}&entity_id=${vendorData?.CoCd}&entityName=${vendorData?.entity_name}&contactName=${vendorData?.CR_name}`, // This need to be updated for the correct path for validating the otp
        vendorName: vendorData?.Vendor_Name_EN,
        instagram: link?.Instagram_Link,
        facebook: link?.Facebook_Link,
        linkedIn: link?.LinkedIn_Link,
        twitter: link?.Twitter_Link,
        youtube: link?.YouTube_Link,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-registration.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      await mail.sendEmail(
        vendorData?.Email, // Recipient
        "Vendor Registration", // Subject
        htmlToSend, // Compiled HTML content
      );

      await InviteVendor.create({
        Vendor_Name: vendorData?.Vendor_Name_EN || "",
        Email: vendorData?.Email || null,
        CoCd: vendorData?.CoCd || null,
        CreatedBy: vendorData?.CreatedBy || null,
      });
      return { status: true, data: "email sent" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async loginOtpMailBuild(vendorData: any) {
    try {
      let expiry = new Date(Date.now() + 2.5 * 60 * 1000);

      let otp = await otpAuthenticattion.generateAndStoreOTP(
        vendorData?.Email,
        expiry,
      );

      let link = await Entity.findOne({
        where: { CoCd: "5950" },
        attributes: [
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
        raw: true,
      });
      const emailData = {
        otp: otp,
        vendorName: vendorData?.Name,
        instagram: link?.Instagram_Link,
        facebook: link?.Facebook_Link,
        linkedIn: link?.LinkedIn_Link,
        twitter: link?.Twitter_Link,
        youtube: link?.YouTube_Link,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "login-otp.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      await mail.sendOtpEmail(
        vendorData?.Email, // Recipient
        " Vendor Portal Login OTP", // Subject
        htmlToSend, // Compiled HTML content,
        vendorData?.Email,
      );
      return { status: true, data: otp };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async loginOtpSMSBuild(vendorData: any, otp: any) {
    try {
      // Step 1: Authenticate to Etisalat API
      const authResponse = await axios.post(
        "https://smartmessaging.etisalat.ae:5676/login/user",
        {
          username: process.env.ETISALAT_USERNAME || "muthu01",
          password: process.env.ETISALAT_PASSWORD || "Muthu@ajay1976",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const token = authResponse?.data?.token;
      if (!token) {
        return { status: false, message: "Auth token missing" };
      }

      // Step 2: Prepare SMS body
      const smsBody = {
        msgCategory: "4.5",
        contentType: "3.7",
        senderAddr: "DAIKIN",
        dndCategory: "Campaign",
        priority: 1,
        clientTxnId: "112346587963",
        schTime: "",
        expiryDt: "",
        desc: "OTP verification message",
        campaignName: "Vendor Login OTP",
        wapUrl: "",
        jobId: `${Date.now()}`, // Unique ID
        recipients: [vendorData?.Phone],
        msg: `Dear ${vendorData?.Name}, Your One-Time Password (OTP) is ${otp}. Please use this code to complete your Login.`,
        dr: "1",
      };

      // Step 3: Send SMS
      const smsResponse = await axios.post(
        "https://smartmessaging.etisalat.ae:5676/campaigns/submissions/sms/b/1",
        smsBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      return { status: true, message: "SMS sent" };
    } catch (error: any) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "SMS failed",
        error: error?.message || "Unknown error",
      };
    }
  }

  async loginOtpOnlySMSBuild(vendorData: any) {
    try {
      let expiry = new Date(Date.now() + 2 * 60 * 1000);

      let otp = await otpAuthenticattion.generateAndStoreOTP(
        vendorData?.Email,
        expiry,
      );

      // Step 1: Authenticate to Etisalat API
      const authResponse = await axios.post(
        "https://smartmessaging.etisalat.ae:5676/login/user",
        {
          username: process.env.ETISALAT_USERNAME || "muthu01",
          password: process.env.ETISALAT_PASSWORD || "Muthu@ajay1976",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const token = authResponse?.data?.token;
      if (!token) {
        return { status: false, message: "Auth token missing" };
      } // Step 2: Prepare SMS body
      const smsBody = {
        msgCategory: "4.5",
        contentType: "3.7",
        senderAddr: "DAIKIN",
        dndCategory: "Campaign",
        priority: 1,
        clientTxnId: "112346587963",
        schTime: "",
        expiryDt: "",
        desc: "OTP verification message",
        campaignName: "Vendor Login OTP",
        wapUrl: "",
        jobId: `${Date.now()}`, // Unique ID
        recipients: [vendorData?.Phone],
        msg: `Dear ${vendorData?.Name}, Your One-Time Password (OTP) is ${otp}. Please use this code to complete your Login.`,
        dr: "1",
      };

      // Step 3: Send SMS
      const smsResponse = await axios.post(
        "https://smartmessaging.etisalat.ae:5676/campaigns/submissions/sms/b/1",
        smsBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      expiry = new Date(Date.now() + 2 * 60 * 1000);

      await User_Otp.update(
        { Expires_at: expiry },
        {
          where: {
            Email: vendorData?.Email,
            Is_Used: false,
          },
        },
      );

      return { status: true, message: "SMS sent" };
    } catch (error: any) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "SMS failed",
        error: error?.message || "Unknown error",
      };
    }
  }

  async resetPwdOtpSMSBuild(vendorData: any, otp: any) {
    try {
      // Step 1: Authenticate to Etisalat API
      const authResponse = await axios.post(
        "https://smartmessaging.etisalat.ae:5676/login/user",
        {
          username: process.env.ETISALAT_USERNAME || "muthu01",
          password: process.env.ETISALAT_PASSWORD || "Muthu@ajay1976",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const token = authResponse?.data?.token;
      if (!token) {
        return { status: false, message: "Auth token missing" };
      }

      // Step 2: Prepare SMS body
      const smsBody = {
        msgCategory: "4.5",
        contentType: "3.7",
        senderAddr: "DAIKIN",
        dndCategory: "Campaign",
        priority: 1,
        clientTxnId: "112346587963",
        schTime: "",
        expiryDt: "",
        desc: "OTP verification message",
        campaignName: "Vendor Login OTP",
        wapUrl: "",
        jobId: `${Date.now()}`, // Unique ID
        recipients: [vendorData?.Phone],
        msg: `Dear ${vendorData?.Name}, Your One-Time Password (OTP) is ${otp}. Please use this code to reset your password.`,
        dr: "1",
      };

      // Step 3: Send SMS
      const smsResponse = await axios.post(
        "https://smartmessaging.etisalat.ae:5676/campaigns/submissions/sms/b/1",
        smsBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      return { status: true, message: "SMS sent" };
    } catch (error: any) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "SMS failed",
        error: error?.message || "Unknown error",
      };
    }
  }

  async resetPasswordMailBuild(vendorData: User) {
    try {
      let expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      let otp = await otpAuthenticattion.generateAndStoreOTPById(
        vendorData?.ID,
        expiry,
      );

      const link = await Entity.findOne({
        where: { CoCd: vendorData?.CoCd },
        attributes: [
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
        raw: true,
      });

      const emailData = {
        otp: otp,
        vendorName: vendorData?.Name,
        instagram: link?.Instagram_Link,
        facebook: link?.Facebook_Link,
        linkedIn: link?.LinkedIn_Link,
        twitter: link?.Twitter_Link,
        youtube: link?.YouTube_Link,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "password-reset.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      mail.sendEmail(
        vendorData?.Email, // Recipient
        "Reset Password", // Subject
        htmlToSend, // Compiled HTML content
      );
      return { status: true, data: "email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async resetPasswordConfirmationMailBuild(
    email: any,
    name: any,
    instagram: string,
    facebook: string,
    linkedIn: string,
    twitter: string,
    youtube: string,
  ) {
    try {
      const emailData = {
        vendorName: name,
        instagram: instagram,
        facebook: facebook,
        linkedIn: linkedIn,
        twitter: twitter,
        youtube: youtube,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "password-reset-confirmation.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      mail.sendEmail(
        email, // Recipient
        "Reset Password Confirmation", // Subject
        htmlToSend, // Compiled HTML content
      );
      return { status: true, data: "email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async forgotPasswordMailBuild(email: string, url: string) {
    try {
      const token = crypto.randomBytes(32).toString("hex");
      const currentDate = new Date();
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      let forgotPasswordResetLink = `${url}?token=${token}`; //need this from FE

      await User.update(
        {
          ResetPasswordToken: token,
          ResetPasswordExpires: convertToSequalizeDateTime(expiryDate),
        },
        { where: { Email: email } },
      );

      let name = await User.findOne({ where: { Email: email } });
      let link = await Entity.findOne({
        where: { CoCd: name?.CoCd },
        attributes: [
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
        raw: true,
      });

      const emailData = {
        LINK: forgotPasswordResetLink,
        vendorName: name?.Name,
        instagram: link?.Instagram_Link,
        facebook: link?.Facebook_Link,
        linkedIn: link?.LinkedIn_Link,
        twitter: link?.Twitter_Link,
        youTube: link?.YouTube_Link,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "Forgot-Password.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      mail.sendEmail(
        email, // Recipient
        "Forgot Password", // Subject
        htmlToSend, // Compiled HTML content
      );
      return { status: true, data: "email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async registrationConfirmationMailBuild(vendorData: any) {
    try {
      const link = await Entity.findOne({
        where: { CoCd: vendorData?.CoCd },
        attributes: [
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
      });

      const emailData = {
        reference_number: vendorData?.reference_number,
        registrationLink: process.env.TrackMyApplicationLink, // portal redirection to tracking page
        vendorName: vendorData?.name,
        instagram: link?.Instagram_Link,
        facebook: link?.Facebook_Link,
        linkedIn: link?.LinkedIn_Link,
        twitter: link?.Twitter_Link,
        youtube: link?.YouTube_Link,
      };

      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-registration-confirmation.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const htmlToSend = template(emailData);

      mail.sendEmail(
        vendorData?.vendor_email, // Recipient
        "Vendor Registration Confirmation", // Subject
        htmlToSend, // Compiled HTML content
      );
      return { status: true, data: "Mail sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async sendEnquiryReportEmail(reportData: {
    email: string;
    csvContent: string;
    user: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "enquiry-report.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });
      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: reportData.user,
        INSTAGRAM: reportData.instagram,
        FACEBOOK: reportData.facebook,
        LINKEDIN: reportData.linkedIn,
        TWITTER: reportData.twitter,
        YOUTUBE: reportData.youtube,
      };
      const htmlToSend = template(emailData);

      await mail.sendEmail(reportData.email, "Enquiry Report", htmlToSend, [
        {
          filename: `enquiry_report_${Date.now()}.csv`,
          content: Buffer.from(reportData.csvContent, "utf8").toString(
            "base64",
          ),
          encoding: "base64",
          contentType: "text/csv; charset=utf-8",
        },
      ]);

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    }
  }

  async CSVEmail(
    poItems: any,
    email: string,
    fields: any,
    headers: any,
    subject: string,
    body: string,
    userName: string,
    fileName?: string,
    links?: any,
  ) {
    const safeFileName =
      fileName && fileName.trim() !== ""
        ? fileName
        : "LogisticInvoiceReport.csv";

    const filePath = path.join(__dirname, safeFileName);

    try {
      if (!poItems || !Array.isArray(poItems) || poItems.length === 0) {
        return { status: false, data: "No data available to export" };
      }

      await generateCSV(poItems, filePath, fields, headers);

      const fileBuffer = fs.readFileSync(filePath);
      const attachment = {
        filename: safeFileName,
        content: fileBuffer,
        encoding: "base64",
        contentType: "text/csv; charset=utf-8",
      };

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Email Notification</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #000000; background-color: #f8f9fa; margin: 0; padding: 0;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 8px; border: 1px solid #ddd;">
      
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img
          src="https://res.cloudinary.com/dvdgpxne8/image/upload/v1747829491/uploads/uploads/logo3-1747829489894.png.png"
          alt="Daikin Logo"
          style="width: 200px;"
        />
      </div>

      <p>Dear <strong>${userName || "User"}</strong>,</p>
      <p>I hope this message finds you well.</p>
      <p>${body}</p>
      <p>Best regards,<br />Daikin Vendor Portal Team</p>

      <div style="margin-top: 30px; font-size: 14px; color: #000000; text-align: center;">
        Copyright © Daikin.  All Rights Reserved | 
        <a href="https://www.daikinmea.com" style="color: #000000;">www.daikinmea.com</a>
      </div>

      <div style="text-align: center; margin-top: 20px;">
  <a href="${links.Facebook_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.Twitter_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.LinkedIn_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733561.png" alt="LinkedIn" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.YouTube_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733646.png" alt="YouTube" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.Instagram_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="Instagram" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
</div>
    </div>
  </body>
</html>
`;

      await mail.sendEmail(email, subject, htmlBody, [attachment]);

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    } finally {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          logger.error("Error:", error);
        }
      }
    }
  }

  async CSVEmailForSOA(
    poItems: any,
    email: string,
    fields: any,
    headers: any,
    subject: string,
    body: string,
    userName: string = "User",
  ) {
    const filePath = path.join(__dirname, "SOAReport.csv");

    try {
      if (!poItems || !Array.isArray(poItems) || poItems.length === 0) {
        return { status: false, data: "No data available to export" };
      }

      await generateCSVForSOA(poItems, filePath, fields, headers);

      const fileBuffer = fs.readFileSync(filePath);
      const attachment = {
        filename: "SOA.csv",
        content: fileBuffer,
        encoding: "base64",
        contentType: "text/csv; charset=utf-8",
      };

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Email Notification</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #000000; background-color: #f8f9fa; margin: 0; padding: 0;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 8px; border: 1px solid #ddd;">
      
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img
          src="https://res.cloudinary.com/dvdgpxne8/image/upload/v1747829491/uploads/uploads/logo3-1747829489894.png.png"
          alt="Daikin Logo"
          style="width: 200px;"
        />
      </div>

      <p>Dear ${userName},</p>
      <p>I hope this message finds you well.</p>
      <p>${body}</p>
      <p>Best regards,<br />Daikin Vendor Portal Team</p>

      <div style="margin-top: 30px; font-size: 14px; color: #000000; text-align: center;">
        Copyright © Daikin.  All Rights Reserved | 
        <a href="https://www.daikinmea.com" style="color: #000000;">www.daikinmea.com</a>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://facebook.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="20" height="20" />
        </a>
        <a href="https://twitter.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" width="20" height="20" />
        </a>
        <a href="https://linkedin.com/company/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733561.png" alt="LinkedIn" width="20" height="20" />
        </a>
        <a href="https://youtube.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733646.png" alt="YouTube" width="20" height="20" />
        </a>
        <a href="https://instagram.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="Instagram" width="20" height="20" />
        </a>
      </div>
    </div>
  </body>
</html>
`;

      await mail.sendEmail(email, subject, htmlBody, [attachment]);

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    } finally {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          logger.error("Error:", error);
        }
      }
    }
  }

  async CSVEmailV3(
    poItems: any,
    email: string,
    fields: any,
    headers: any,
    subject: string,
    body: string,
    userName: string, // default fallback
    links: any,
    fileName: string = "Invoices.csv",
  ) {
    try {
      const filePath = path.join(__dirname, fileName);

      await generateCSV(poItems, filePath, fields, headers);

      const fileBuffer = fs.readFileSync(filePath);

      const attachment = {
        filename: fileName,
        content: fileBuffer,
        encoding: "base64",
        contentType: "text/csv; charset=utf-8",
      };

      fs.unlinkSync(filePath);

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Email Notification</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #000000; background-color: #f8f9fa; margin: 0; padding: 0;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 8px; border: 1px solid #ddd;">
      
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img
          src="https://res.cloudinary.com/dvdgpxne8/image/upload/v1747829491/uploads/uploads/logo3-1747829489894.png.png"
          alt="Daikin Logo"
          style="width: 200px;"
        />
      </div>

      <p>Dear <strong>${userName || "User"}</strong>,</p>
      <p>I hope this message finds you well.</p>
      <p>${body}</p>
      <p>Best regards,<br />Daikin Vendor Portal Team</p>

      <div style="margin-top: 30px; font-size: 14px; color: #000000; text-align: center;">
        Copyright © Daikin.  All Rights Reserved | 
        <a href="https://www.daikinmea.com" style="color: #000000;">www.daikinmea.com</a>
      </div>

      <div style="text-align: center; margin-top: 20px;">
  <a href="${links.Facebook_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.Twitter_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.LinkedIn_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733561.png" alt="LinkedIn" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.YouTube_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733646.png" alt="YouTube" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
  <a href="${links.Instagram_Link
        }" target="_blank" style="margin: 0 5px; text-decoration: none; border: none; outline: none;">
    <img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="Instagram" width="20" height="20" style="border: none; outline: none; text-decoration: none;" />
  </a>
</div>
    </div>
  </body>
</html>
`;

      await mail.sendReportEmail(email, subject, htmlBody, [attachment]);

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    }
  }

  async CSVEmailV4(
    poItems: any,
    email: string,
    fields: any,
    headers: any,
    subject: string,
    body: string,
    userName: string, // default fallback
    fileName: string = "Invoices.csv",
  ) {
    try {
      const filePath = path.join(__dirname, fileName);

      await generateCSV(poItems, filePath, fields, headers);

      const fileBuffer = fs.readFileSync(filePath);

      const attachment = {
        filename: fileName,
        content: fileBuffer,
        encoding: "base64",
        contentType: "text/csv; charset=utf-8",
      };

      fs.unlinkSync(filePath);

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Email Notification</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #000000; background-color: #f8f9fa; margin: 0; padding: 0;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 8px; border: 1px solid #ddd;">
      
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img
          src="https://res.cloudinary.com/dvdgpxne8/image/upload/v1747829491/uploads/uploads/logo3-1747829489894.png.png"
          alt="Daikin Logo"
          style="width: 200px;"
        />
      </div>

      <p>Dear <strong>${userName || "User"}</strong>,</p>
      <p>I hope this message finds you well.</p>
      <p>${body}</p>
      <p>Best regards,<br />Daikin Vendor Portal Team</p>

      <div style="margin-top: 30px; font-size: 14px; color: #000000; text-align: center;">
        Copyright © Daikin.  All Rights Reserved | 
        <a href="https://www.daikinmea.com" style="color: #000000;">www.daikinmea.com</a>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://facebook.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="20" height="20" />
        </a>
        <a href="https://twitter.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" width="20" height="20" />
        </a>
        <a href="https://linkedin.com/company/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733561.png" alt="LinkedIn" width="20" height="20" />
        </a>
        <a href="https://youtube.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733646.png" alt="YouTube" width="20" height="20" />
        </a>
        <a href="https://instagram.com/daikin" target="_blank" style="margin: 0 5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="Instagram" width="20" height="20" />
        </a>
      </div>
    </div>
  </body>
</html>
`;

      await mail.sendReportEmail(email, subject, htmlBody, [attachment]);

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    }
  }

  async CSVEmailV2(
    items: any,
    email: string,
    fields: any,
    headers: any,
    subject: string,
    body: string,
    fileNames: string,
  ) {
    try {
      const filePath = path.join(__dirname, fileNames);

      await generateCSV(items, filePath, fields, headers);

      const fileBuffer = fs.readFileSync(filePath);

      const attachment = {
        filename: fileNames,
        content: fileBuffer,
        encoding: "base64",
        contentType: "text/csv; charset=utf-8",
      };

      fs.unlinkSync(filePath);

      mail.sendReportEmail(email, subject, body, [attachment]);

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    }
  }

  async sendAdvancePaymentReportEmail(reportData: {
    email: string;
    csvContent: string;
    user: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "Advance-payment-report.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });
      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: reportData.user,
        INSTAGRAM: reportData.instagram,
        FACEBOOK: reportData.facebook,
        LINKEDIN: reportData.linkedIn,
        TWITTER: reportData.twitter,
        YOUTUBE: reportData.youtube,
      };
      const htmlToSend = template(emailData);

      await mail.sendEmail(
        reportData.email,
        "Advance Payment Report",
        htmlToSend,
        [
          {
            filename: `advance_payment_report_${Date.now()}.csv`,
            content: Buffer.from(reportData.csvContent, "utf8").toString(
              "base64",
            ),
            encoding: "base64",
            contentType: "text/csv; charset=utf-8",
          },
        ],
      );

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    }
  }

  async sendLogisticInvoicesEmail(reportData: {
    email: string;
    csvFilePath: string;
    user: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "logistic-invoice-report.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });
      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: reportData.user,
      };
      const htmlToSend = template(emailData);

      await mail.sendEmail(
        reportData.email,
        "Logistic Invoice Report",
        htmlToSend,
        [
          {
            filename: `logistic_invoice_report_${Date.now()}.csv`,
            path: reportData.csvFilePath,
            contentType: "text/csv; charset=utf-8",
          },
        ],
      );

      return { status: true, data: null };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: `Mail not sent: ${error}` };
    }
  }

  async sendGeneralEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    body: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "general-email.html",
      );
      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      const emailData = {
        USER_NAME: emailParams?.user,
        EMAIL_BODY: emailParams?.body?.replace(/\n/g, "<br>"),
      };
      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendManagerApprovalRequestEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    applicationDate: string;
    description: string;
    contactInfo: string;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "manager-approval-request-email.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";

      const attachments = await fetchEmailAttachments(
        emailParams?.attachmentUrls,
      );

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        APPLICATION_DATE: emailParams?.applicationDate,
        DESCRIPTION: emailParams?.description,
        CONTACT_INFO: emailParams?.contactInfo,
        FILE_LINKS: filesHtml,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendInvoiceSubmissionToVIM(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    entityName: string;
    vendorCode: string;
    invoiceRef: string;
    poCode: string;
    attachments: any;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "invoice-vim.html", // your new HTML template
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const attachments = await Promise.all(
        (emailParams?.attachments || []).map(
          async (file: {
            filename?: string;
            path: string;
            document_name?: string;
          }) => {
            try {
              // Build the local file path
              const localPath = path.join(
                process.env.VENDOR_FOLDER_PATH ||
                "E:/Source code new/Vendor-Portal/BE/uploads",
                file?.path?.split("/uploads/")?.[1], // get relative path after "uploads/"
              );

              // Read file as a buffer
              const data = await fspromise.readFile(localPath);

              return {
                filename:
                  file?.document_name ||
                  file?.filename ||
                  path.basename(localPath),
                content: data,
                contentType: "application/pdf", // adjust if needed dynamically
              };
            } catch (error) {
              logger.error("Error:", error);
              return null;
            }
          },
        ),
      ).then((files) => files.filter(Boolean));

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        ENTITY_NAME: emailParams?.entityName,
        VENDOR_CODE: emailParams?.vendorCode,
        INVOICE_REF: emailParams?.invoiceRef,
        PO_CODE: emailParams?.poCode,
        ATTCHMENTS: attachments?.map((a: any) => a?.filename),
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendPOInvoiceSubmissionToVIM(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    entityName: string;
    vendorCode: string;
    invoiceRef: string;
    poCode: string;
    attachments: any;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "po-invoice-vim.html", // your new HTML template
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const attachments = await Promise.all(
        (emailParams?.attachments || []).map(
          async (file: {
            filename?: string;
            path: string;
            document_name?: string;
          }) => {
            try {
              // Build the local file path
              const localPath = path.join(
                process.env.VENDOR_FOLDER_PATH ||
                "E:/Source code new/Vendor-Portal/BE/uploads",
                file?.path?.split("/uploads/")?.[1], // get relative path after "uploads/"
              );

              // Read file as a buffer
              const data = await fspromise.readFile(localPath);

              return {
                filename:
                  file?.document_name ||
                  file?.filename ||
                  path.basename(localPath),
                content: data,
                contentType: "application/pdf", // adjust if needed dynamically
              };
            } catch (error) {
              logger.error("Error:", error);
              return null;
            }
          },
        ),
      ).then((files) => files.filter(Boolean));

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        ENTITY_NAME: emailParams?.entityName,
        VENDOR_CODE: emailParams?.vendorCode,
        INVOICE_REF: emailParams?.invoiceRef,
        PO_CODE: emailParams?.poCode,
        ATTCHMENTS: attachments?.map((a: any) => a?.filename),
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendLogisticsToCR(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    vendorCode: string;
    invoiceList: {
      number: string;
      date: string | null;
      amount: number | null;
    }[];
    attachments: any;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-cr-logistics.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });
      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        VENDOR_CODE: emailParams?.vendorCode,
        INVOICE_LIST: emailParams?.invoiceList,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        emailParams?.attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendAdvanceSubmissionToVIM(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    entityName: string;
    vendorCode: string;
    invoiceRef: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "Advance-payment-to-cr.html", // your new HTML template
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        ENTITY_NAME: emailParams?.entityName,
        VENDOR_CODE: emailParams?.vendorCode,
        INVOICE_REF: emailParams?.invoiceRef,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendCreditNoteRequestToVendor(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    vendorCode: string;
    invoiceRef: string;
    poCode: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "credit-note-request.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        VENDOR_CODE: emailParams?.vendorCode,
        INVOICE_REF: emailParams?.invoiceRef,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendManagerToCrApprovalEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    approvalDate: string;
    description: string;
    contactInfo: string;
    managerName: any;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "manager-to-cr-approval-email.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";

      const attachments = await fetchEmailAttachments(
        emailParams?.attachmentUrls,
      );

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        APPROVAL_DATE: emailParams?.approvalDate,
        DESCRIPTION: emailParams?.description,
        CONTACT_INFO: emailParams?.contactInfo,
        MANAGER_NAME: emailParams?.managerName,
        FILE_LINKS: filesHtml,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendNewVendorApplicationEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    applicationDate: string;
    description: string;
    contactInfo: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "new-vendor-application-email.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        APPLICATION_DATE: emailParams?.applicationDate,
        DESCRIPTION: emailParams?.description,
        CONTACT_INFO: emailParams?.contactInfo,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorUpdateEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    updateDate: string;
    contactInfo: string;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-update-to-cr.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";

      const attachments = await fetchEmailAttachments(
        emailParams?.attachmentUrls,
      );

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        UPDATE_DATE: emailParams?.updateDate,
        CONTACT_INFO: emailParams?.contactInfo,
        FILE_LINKS: filesHtml,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments || [],
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorApproveEmail(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    vendorId: string;
    updateDate: string;
    attachmentUrls?: any;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-update-confirmation.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "daikinmea.com";

      const attachments = await fetchEmailAttachments(
        emailParams?.attachmentUrls,
      );

      const emailData = {
        vendorName: emailParams?.vendorName,
        vendorId: emailParams?.vendorId,
        vendorPortalLink: process.env.FE_URL,
        updateDate: emailParams?.updateDate,
        file_link: filesHtml,
        linkedIn: emailParams?.linkedIn,
        facebook: emailParams?.facebook,
        instagram: emailParams?.instagram,
        twitter: emailParams?.twitter,
        youtube: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorRejectEmail(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-update-rejection.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        vendorName: emailParams?.vendorName,
        rejectionMessage: emailParams?.rejectionReason,
        linkedIn: emailParams?.linkedIn,
        facebook: emailParams?.facebook,
        instagram: emailParams?.instagram,
        twitter: emailParams?.twitter,
        youtube: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendNewEntityRequestEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    updateDate: string;
    entityRequested: string;
    contactInfo: string;
    linkedIn?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "new-entity-request-email.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        UPDATE_DATE: emailParams?.updateDate,
        ENTITY_REQUESTED: emailParams?.entityRequested,
        CONTACT_INFO: emailParams?.contactInfo,
        INSTAGRAM: emailParams?.instagram || "",
        FACEBOOK: emailParams?.facebook || "",
        LINKEDIN: emailParams?.linkedIn || "",
        TWITTER: emailParams?.twitter || "",
        YOUTUBE: emailParams?.youtube || "",
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendNewEntityRequestManagerToCrEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    updateDate: string;
    entityRequested: string;
    contactInfo: string;
    managerName: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "new-entity-approval-manager-to-cr.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        UPDATE_DATE: emailParams?.updateDate,
        ENTITY_REQUESTED: emailParams?.entityRequested,
        CONTACT_INFO: emailParams?.contactInfo,
        MANAGER_1: emailParams?.managerName,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendCrApprovalRequestEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    invoiceNumber: string;
    amount: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-cr-approved.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        INVOICE_NUMBER: emailParams?.invoiceNumber,
        AMOUNT: emailParams?.amount,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendCrToManager1RequestEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    invoiceNumber: string;
    amount: string;
    managerName: string;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "cr-to-manager-approved.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      let filesHtml = "";
      const attachments = [];

      if (
        emailParams?.attachmentUrls &&
        emailParams?.attachmentUrls?.length > 0
      ) {
        for (const url of emailParams?.attachmentUrls || []) {
          try {
            // Build local file path based on your uploads folder
            const localPath = path.join(
              process.env.VENDOR_FOLDER_PATH ||
              "E:/Source code new/Vendor-Portal/BE/uploads",
              url?.split("/uploads/")?.[1], // get relative path after "uploads/"
            );

            // Read file as buffer
            const buffer = await fspromise.readFile(localPath);

            const filename = decodeURIComponent(
              url.split("/").pop() || "Attachment",
            );

            attachments.push({
              filename,
              content: buffer,
              // Optionally set contentType if needed
              contentType: "application/pdf", // adjust dynamically if needed
            });
          } catch (error) {
            logger.error("Error:", error);
            throw error;
          }
        }
      }

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        INVOICE_NUMBER: emailParams?.invoiceNumber,
        AMOUNT: emailParams?.amount,
        MANAGER1_NAME: emailParams?.managerName,
        FILE_LINKS: filesHtml,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments || [],
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendManager2ToVimRequestEmail(emailParams: {
    email: string;
    entity_code: string;
    entity_name: string;
    subject: string;
    vendorName: string;
    invoiceNumber: string;
    vendor_code: string;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "manager2-to-vim.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);
      let filesHtml = "";
      const attachments = [];

      const newFilename = emailParams?.invoiceNumber;

      if (
        emailParams?.attachmentUrls &&
        emailParams?.attachmentUrls?.length > 0
      ) {
        for (const url of emailParams?.attachmentUrls || []) {
          try {
            // Build the local file path based on your uploads folder
            const localPath = path.join(
              process.env.VENDOR_FOLDER_PATH ||
              "E:/Source code new/Vendor-Portal/BE/uploads",
              url?.split("/uploads/")?.[1], // get relative path after "uploads/"
            );

            // Read the file as a buffer
            const buffer = await fspromise.readFile(localPath);

            // Use invoiceNumber as filename
            const filename = `${emailParams?.invoiceNumber || "Attachment"}.pdf`;

            attachments.push({
              filename,
              content: buffer,
              contentType: "application/pdf", // optional
            });
          } catch (error) {
            logger.error("Error:", error);
            throw error;
          }
        }
      }
      const emailData = {
        VENDOR_NAME: emailParams?.vendorName,
        INVOICE_REF: emailParams?.invoiceNumber,
        ENTITY_CODE: emailParams?.entity_code,
        VENDOR_CODE: emailParams?.vendor_code,
        ENTITY_NAME: emailParams?.entity_name,
        FILE_LINKS: filesHtml,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments || [],
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendManager1ToManager2RequestEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    invoiceNumber: string;
    amount: string;
    managerName: string;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "manager-to-manager-approval.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";

      const attachments = await fetchEmailAttachments(
        emailParams?.attachmentUrls,
      );

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        INVOICE_NUMBER: emailParams?.invoiceNumber,
        AMOUNT: emailParams?.amount,
        MANAGER2_NAME: emailParams?.managerName,
        FILE_LINKS: filesHtml,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendManager2ToCrRequestEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    invoiceNumber: string;
    managerName: string;
    approvalDate: string;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "manager-to-cr-approved.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";

      const attachments = await fetchEmailAttachments(
        emailParams?.attachmentUrls,
      );

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        INVOICE_NUMBER: emailParams?.invoiceNumber,
        MANAGER2_NAME: emailParams?.managerName,
        APPROVAL_DATE: emailParams?.approvalDate,
        FILE_LINKS: filesHtml,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorEntityApproveEmail(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    vendorId: string;
    extensionDate: string;
    approvedExtensions: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-extension-confirmation.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        vendorName: emailParams?.vendorName,
        vendorId: emailParams?.vendorId,
        extensionDate: emailParams?.extensionDate,
        approvedExtensions: emailParams?.approvedExtensions,
        linkedIn: emailParams?.linkedIn,
        facebook: emailParams?.facebook,
        instagram: emailParams?.instagram,
        twitter: emailParams?.twitter,
        youtube: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorEntityRejectEmail(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    vendorId: number;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-extension-rejection.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        vendorName: emailParams?.vendorName,
        vendorId: emailParams?.vendorId,
        rejectionMessage: emailParams?.rejectionReason,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendInvoiceApprovedMailToVendor(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    invoiceNo: number;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-invoice-approved.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        VENDORNAME: emailParams?.vendorName,
        INVOICE_NO: emailParams?.invoiceNo,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorRejectLogisticsEmail(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    invoiceNumber: number;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "cr-to-vendor-reject-logistics.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        VENDOR_NAME: emailParams?.vendorName,
        INV_NUMBER: emailParams?.invoiceNumber,
        REJECTION_REASON: emailParams?.rejectionReason,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorRejectAdvanceEmail(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    refNumber: number;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "Advance-payment-rejection.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        VENDOR_NAME: emailParams?.vendorName,
        INVOICE_REF: emailParams?.refNumber,
        REJECTION_REASON: emailParams?.rejectionReason,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendRejectLogisticsToCrEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    invoiceNumber: string;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "manager-to-cr-reject-logistics.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        INVOICE_NUMBER: emailParams?.invoiceNumber,
        REJECTION_REASON: emailParams?.rejectionReason,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendInvoiceRejectionMailToVendor(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    invoiceNo: number;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-invoice-rejection.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        VENDORNAME: emailParams?.vendorName,
        INVOICE_NO: emailParams?.invoiceNo,
        REJECTION_REASON: emailParams?.rejectionReason,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendVendorUpdateManagerEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    managerName: string;
    updateDate: string;
    contactInfo: string;
    attachmentUrls?: string[];
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-update-to-manager.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";

      const attachments = await fetchEmailAttachments(
        emailParams?.attachmentUrls,
      );

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        MANAGER_NAME: emailParams?.managerName,
        UPDATE_DATE: emailParams?.updateDate,
        CONTACT_INFO: emailParams?.contactInfo,
        FILE_LINKS: filesHtml,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments || [],
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendEnquirySubmissionToCr(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    vendorCode: string;
    enquiryRef: number;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "enquiry-to-cr.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        VENDOR_CODE: emailParams?.vendorCode,
        ENQUIRY_REF: emailParams?.enquiryRef,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendEnquirySubmissionToVendor(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    vendorCode: string;
    enquiryRef: number;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "enquiry-to-vendor.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        VENDOR_CODE: emailParams?.vendorCode,
        ENQUIRY_REF: emailParams?.enquiryRef,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendEnquiryUpdatesToVendor(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    STATUS: string;
    ENQUIRY_CODE: number;
    linkedIn?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "enquiry-status-update.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, "utf8");
      const template = Handlebars.compile(htmlTemplate);

      // Build email data for template
      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        STATUS: emailParams?.STATUS,
        ENQUIRY_CODE: emailParams?.ENQUIRY_CODE,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
        UPDATED_DATE: new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        CURRENT_YEAR: new Date().getFullYear(),
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendResponseToCr(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    entityName: string;
    vendorCode: string;
    enquiryRef: number;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "enquiry-comments.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        ENTITY_NAME: emailParams?.entityName,
        VENDOR_CODE: emailParams?.vendorCode,
        ENQUIRY_REF: emailParams?.enquiryRef,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendResponseToVendor(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    crName: string;
    entityCode: string;
    status: string;
    entityName: string;
    enquiryRef: number;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "enquiry-comments-from-cr.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        CR_NAME: emailParams?.crName,
        ENTITY_CODE: emailParams?.entityCode,
        ENQUIRY_STATUS: emailParams?.status,
        ENTITY_NAME: emailParams?.entityName,
        ENQUIRY_REF: emailParams?.enquiryRef,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendNewEntityRejectManagerToCrEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityRequested: string;
    contactInfo: string;
    managerName: string;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "new-entity-rejection-manager-to-cr.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_REQUESTED: emailParams?.entityRequested,
        CONTACT_INFO: emailParams?.contactInfo,
        MANAGER_1: emailParams?.managerName,
        REJECT_REASON: emailParams?.rejectionReason,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendNonPoInvoiceSubmissionToVIM(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    entityCode: string;
    entityName: string;
    vendorCode: string;
    invoiceRef: string;
    poCode: string;
    crName: string;
    attachments: any;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "non-po-invoice-vim.html", // your new HTML template
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const attachments = await Promise.all(
        (emailParams?.attachments || []).map(async (file: any) => {
          try {
            // Construct the full local path to the file
            // Assuming your uploads folder is configured in an env variable
            const localPath = path.join(
              process.env.VENDOR_FOLDER_PATH ||
              "E:/Source code new/Vendor-Portal/BE/uploads",
              file?.path?.split("/uploads/")?.[1], // get relative path after "uploads/"
            );

            // Read the file as a buffer
            const data = await fspromise.readFile(localPath);

            return {
              filename:
                file?.document_name ||
                file?.filename ||
                path.basename(localPath),
              content: data,
              contentType: "application/pdf", // Set contentType manually if needed
            };
          } catch (error) {
            logger.error("Error:", error);
            return null;
          }
        }),
      ).then((files) => files.filter(Boolean));
      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        ENTITY_CODE: emailParams?.entityCode,
        ENTITY_NAME: emailParams?.entityName,
        VENDOR_CODE: emailParams?.vendorCode,
        INVOICE_REF: emailParams?.invoiceRef,
        PO_CODE: emailParams?.poCode,
        CR_NAME: emailParams?.crName,
        ATTCHMENTS: attachments?.map((a: any) => a?.filename),
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        attachments,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendInvoiceApprovalToVendor(emailParams: {
    email: string;
    user: string;
    subject: string;
    VENDOR_NAME: string;
    ENTITY_CODE: string;
    ENTITY_NAME: string;
    VENDOR_CODE: string;
    INVOICE_REF: string;
    INVOICE_TYPE: string;
    IS_PO_BASED: boolean;
    IS_LOGISTICS: boolean;
    IS_CREDIT_NOTE: boolean;
    FACEBOOK?: string;
    TWITTER?: string;
    LINKEDIN?: string;
    YOUTUBE?: string;
    INSTAGRAM?: string;
    attachments?: any;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "invoice-approval.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.VENDOR_NAME,
        ENTITY_CODE: emailParams?.ENTITY_CODE,
        ENTITY_NAME: emailParams?.ENTITY_NAME,
        VENDOR_CODE: emailParams?.VENDOR_CODE,
        INVOICE_REF: emailParams?.INVOICE_REF,
        INVOICE_TYPE: emailParams?.INVOICE_TYPE,
        IS_PO_BASED: emailParams?.IS_PO_BASED,
        IS_LOGISTICS: emailParams?.IS_LOGISTICS,
        IS_CREDIT_NOTE: emailParams?.IS_CREDIT_NOTE,
        FACEBOOK: emailParams?.FACEBOOK,
        TWITTER: emailParams?.TWITTER,
        LINKEDIN: emailParams?.LINKEDIN,
        YOUTUBE: emailParams?.YOUTUBE,
        INSTAGRAM: emailParams?.INSTAGRAM,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendInvoiceRejectionToVendor(emailParams: {
    email: string;
    user: string;
    subject: string;
    VENDOR_NAME: string;
    ENTITY_CODE: string;
    ENTITY_NAME: string;
    VENDOR_CODE: string;
    INVOICE_REF: string;
    INVOICE_TYPE: string;
    IS_PO_BASED: boolean;
    IS_LOGISTICS: boolean;
    IS_CREDIT_NOTE: boolean;
    FACEBOOK?: string;
    TWITTER?: string;
    LINKEDIN?: string;
    YOUTUBE?: string;
    INSTAGRAM?: string;
    attachments?: any;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "invoice-rejection.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.VENDOR_NAME,
        ENTITY_CODE: emailParams?.ENTITY_CODE,
        ENTITY_NAME: emailParams?.ENTITY_NAME,
        VENDOR_CODE: emailParams?.VENDOR_CODE,
        INVOICE_REF: emailParams?.INVOICE_REF,
        INVOICE_TYPE: emailParams?.INVOICE_TYPE,
        IS_PO_BASED: emailParams?.IS_PO_BASED,
        IS_LOGISTICS: emailParams?.IS_LOGISTICS,
        IS_CREDIT_NOTE: emailParams?.IS_CREDIT_NOTE,
        FACEBOOK: emailParams?.FACEBOOK,
        TWITTER: emailParams?.TWITTER,
        LINKEDIN: emailParams?.LINKEDIN,
        YOUTUBE: emailParams?.YOUTUBE,
        INSTAGRAM: emailParams?.INSTAGRAM,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendNewEntityRejectEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    vendorName: string;
    crName: string;
    updateDate: string;
    entityRequested: string;
    rejectionReason: string;
    linkedIn?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "new-entity-reject-email.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        VENDOR_NAME: emailParams?.vendorName,
        CR_NAME: emailParams?.crName,
        UPDATE_DATE: emailParams?.updateDate,
        ENTITY_REQUESTED: emailParams?.entityRequested,
        REJECT_REASON: emailParams?.rejectionReason,
        INSTAGRAM: emailParams?.instagram || "",
        FACEBOOK: emailParams?.facebook || "",
        LINKEDIN: emailParams?.linkedIn || "",
        TWITTER: emailParams?.twitter || "",
        YOUTUBE: emailParams?.youtube || "",
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  async sendRegistrationRejectEmail(emailParams: {
    email: string;
    subject: string;
    vendorName: string;
    referenceNumber: string;
    applicationDate: string;
    rejectionReason: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "vendor-registration-rejection.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      let filesHtml = "";
      const emailData = {
        VENDOR_NAME: emailParams?.vendorName,
        REFERENCR_NUMBER: emailParams?.referenceNumber,
        APPLICATION_DATE: emailParams?.applicationDate,
        REJECT_REASON: emailParams?.rejectionReason,
        INSTAGRAM: emailParams?.instagram,
        FACEBOOK: emailParams?.facebook,
        LINKEDIN: emailParams?.linkedIn,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  // For Approval Emails
  async sendBulkApprovalEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    body: string;
    invoices: Array<{
      vendorName: string;
      invoiceNumber: string;
      amount: string;
    }>;
    footer: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "bulk-approval.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        BODY: emailParams?.body,
        INVOICES: emailParams?.invoices,
        TOTAL_COUNT: emailParams?.invoices?.length,
        FOOTER: emailParams?.footer,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        [],
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }

  // For Rejection Emails
  async sendBulkRejectionEmail(emailParams: {
    email: string;
    user: string;
    subject: string;
    body: string;
    invoices: Array<{ invoiceNumber: string; amount: string }>;
    footer: string;
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  }) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "template",
        "bulk-rejection.html",
      );

      const htmlTemplate = await fs.promises.readFile(templatePath, {
        encoding: "utf8",
      });

      const template = Handlebars.compile(htmlTemplate);

      const emailData = {
        USER_NAME: emailParams?.user,
        BODY: emailParams?.body,
        INVOICES: emailParams?.invoices,
        TOTAL_COUNT: emailParams?.invoices?.length,
        FOOTER: emailParams?.footer,
        LINKEDIN: emailParams?.linkedIn,
        FACEBOOK: emailParams?.facebook,
        INSTAGRAM: emailParams?.instagram,
        TWITTER: emailParams?.twitter,
        YOUTUBE: emailParams?.youtube,
      };

      const htmlToSend = template(emailData);

      await mail.sendEmail(
        emailParams?.email,
        emailParams?.subject,
        htmlToSend,
        [],
      );

      return { status: true };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: `Mail not sent: ${error}` };
    }
  }
}

export default new ConstructMail();
