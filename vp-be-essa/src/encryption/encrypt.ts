import { Request } from "express";
import ReqResEncrypt from "./reqResEncrypt";
import logger from "../utils/logger";
import MsgResponse from "../responses/response";
import { ResponseStatus } from "../responses/code";

class Encryption {
    /**
     * @description This function makes request to be decrypt
     * @param req
     * @param res
     * @returns
     */
    async decryptReq(req: Request, res: any) {
        try {
            //Body type
            if (req?.body && Object.keys(req?.body).length) {
                // if req body is not string error will be returned
                if (typeof req?.body !== "string") {
                    return MsgResponse.errors(
                        req,
                        res,
                        ResponseStatus.HTTP_UNSUPPORTED_MEDIA_TYPE,
                        ResponseStatus?.$statusTexts?.[415],
                    );
                }
                const data: any = await ReqResEncrypt.requestDecryption(req?.body);
                req.body = data ? JSON.parse(data) : data;
                if (!req?.body) {
                    return MsgResponse.errors(
                        req,
                        res,
                        ResponseStatus.HTTP_UNSUPPORTED_MEDIA_TYPE,
                        ResponseStatus?.$statusTexts?.[415],
                    );
                }
                return req?.body;
            }

            //Query
            if (req?.query && req?.query?.request) {
                const data: any = await ReqResEncrypt.requestDecryption(
                    req?.query?.request,
                );

                if (!data) {
                    return MsgResponse.errors(
                        req,
                        res,
                        ResponseStatus.HTTP_UNSUPPORTED_MEDIA_TYPE,
                        ResponseStatus?.$statusTexts?.[415],
                    );
                } else {
                    req.query = JSON.parse(data); // url string to json conversion
                    return req?.query;
                }
            }
        } catch (error) {
            logger.error("Error:", error);
            return MsgResponse.errors(
                req,
                res,
                ResponseStatus.HTTP_UNSUPPORTED_MEDIA_TYPE,
                ResponseStatus?.$statusTexts?.[415],
            );
        }
    }

    /**
     * @description This function makes a response to encrypt
     * @param req
     * @param res
     * @returns
     */
    async encryptRes(req: Request, res: any) {
        try {
            // if true encrypeted response will be sent.
            let sendEncryptedResponse = res?.send;
            return (res.send = async function (data: any) {
                let body = await ReqResEncrypt.responseEncryption(data); // Result a string of letters and numbers
                sendEncryptedResponse?.apply(this, [body]);
            });
        } catch (error) {
            logger.error("Error:", error);
            return MsgResponse.errors(
                req,
                res,
                ResponseStatus.HTTP_UNSUPPORTED_MEDIA_TYPE,
                ResponseStatus?.$statusTexts?.[415],
            );
        }
    }

    /**
     * @description This function will check the req is valid for encrypt
     * @param req
     * @param res
     * @returns
     */
    async checkForEncryption(req: Request, res: any) {
        try {
            if (req?.body && req?.query) {
                if (
                    typeof req?.body === "string" ||
                    typeof req?.query?.request === "string"
                )
                    return MsgResponse.errors(
                        req,
                        res,
                        ResponseStatus.HTTP_UNSUPPORTED_MEDIA_TYPE,
                        ResponseStatus?.$statusTexts?.[415],
                    );
            }
        } catch (error) {
            logger.error("Error:", error);
            return MsgResponse.errors(
                req,
                res,
                ResponseStatus.HTTP_UNSUPPORTED_MEDIA_TYPE,
                ResponseStatus?.$statusTexts?.[415],
            );
        }
    }
}

export default new Encryption();
