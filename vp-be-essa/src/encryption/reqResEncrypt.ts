import CryptoJS from "crypto-js";
import logger from "../utils/logger";

class ReqResEncrypt {
    /**
     * Decryption for all incoming requests
     */
    requestDecryption = async (text: any) => {
        return new Promise<string>((resolve: any, reject: any) => {
            try {
                const decryptedData = CryptoJS.AES.decrypt(
                    text ?? "",
                    "bf3c199c2470cb477d907b1e0917c17b",
                ).toString(CryptoJS.enc.Utf8);
                return resolve(
                    decryptedData ? JSON.parse(decryptedData) : decryptedData,
                );
            } catch (error) {
                logger.error("Error:", error);
                return reject(error);
            }
        });
    };

    /**
     * Encryption for all processed responses
     */
    responseEncryption = async (text: any) => {
        return new Promise<string>((resolve: any, reject: any) => {
            try {
                let body = JSON.stringify(text ?? "");
                const encryptedData = CryptoJS.AES.encrypt(
                    body,
                    "bf3c199c2470cb477d907b1e0917c17b",
                ).toString();
                return resolve(encryptedData);
            } catch (error) {
                logger.error("Error:", error);
                return reject(error);
            }
        });
    };
}

export default new ReqResEncrypt();
