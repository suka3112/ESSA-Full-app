import { sequelize } from "../config/sequelize";
import { BaseController } from "../controllers/baseController";
import { User_Otp } from "../models/userOtp";
import { convertToSequalizeDateTime } from "./globalFunction";
import { APIError } from "./apiError.utils";
import { StatusCodeEnum } from "./enums/status.enum";

class OtpAuthenticator extends BaseController {
  async generateAndStoreOTP(email: string, expiry: any): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedDate = convertToSequalizeDateTime(expiry);

    await User_Otp.update(
      { Is_Active: false },
      {
        where: {
          Email: email,
          Is_Used: false,
        },
      },
    );

    await User_Otp.create({
      Email: email,
      otp: otp,
      Expires_at: formattedDate,
    });

    return otp;
  }

  // Function to validate OTP
  async validateOTP(
    email: string,
    userOTP: string,
    isRegister: any,
  ): Promise<boolean> {
    const result = await User_Otp.findOne({
      where: {
        Email: email,
        otp: userOTP,
        Is_Used: false,
        Is_Active: true,
      },
      raw: true,
    });

    if (!result)
      throw new APIError(
        "Wrong OTP Please Try again",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );

    if (!isRegister) {
      const created = new Date(result?.CreatedDt).getTime();
      const now = Date.now();
      const diffMs = now - created;
      if (result && diffMs > 2.5 * 60 * 1000) {
        throw new APIError(
          "OTP Expires, Please Try again",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
    }

    await sequelize.query(
      `UPDATE "USER_OTP" SET "Is_Used" = true WHERE "ID" = :id`,
      {
        replacements: {
          id: result?.ID,
        },
      },
    );
    return true;
  }

  async validateTOTP(email: any, userOTP: string): Promise<boolean> {
    const [result]: any = await sequelize.query(
      `SELECT * FROM "USER_OTP" WHERE "Email" = :email AND otp = :otp AND "Is_Used" = false`,
      {
        replacements: {
          email: email,
          otp: userOTP,
        },
      },
    );

    if ((result?.length ?? 0) > 0) {
      await sequelize.query(
        `UPDATE "USER_OTP" SET "Is_Used" = true WHERE "ID" = :id`,
        {
          replacements: {
            id: result?.[0]?.ID,
          },
        },
      );
      return true;
    }
    return false;
  }

  async generateAndStoreOTPById(
    user_id: number,
    expiry: Date,
  ): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await User_Otp.create({
      User_Id: user_id,
      otp: otp,
      Expires_at: convertToSequalizeDateTime(expiry),
    });

    return otp;
  }

  async validateOTPById(user_id: number, userOTP: string): Promise<boolean> {
    const [result]: any = await sequelize.query(
      `SELECT * FROM "USER_OTP" WHERE "User_Id" = :user_id AND otp = :otp AND "Expires_at" >= NOW() AND "Is_Used" = false`,
      {
        replacements: {
          user_id: user_id,
          otp: userOTP,
        },
      },
    );

    if ((result?.length ?? 0) > 0) {
      await sequelize.query(
        `UPDATE "USER_OTP" SET "Is_Used" = true WHERE "ID" = :id`,
        {
          replacements: {
            id: result?.[0]?.ID,
          },
        },
      );
      return true;
    }
    return false;
  }
}

export default new OtpAuthenticator();
