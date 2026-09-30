import logger from './logger';

/**
 * @deprecated Use logger from utils/logger.ts instead
 * This class is kept for backward compatibility
 * Only error logging is supported now
 */
export class ConsoleLog {

    static log(...data: any[]) {
        // Removed - only error logging supported
    }

    info = (...data: string[]) => {
        // Removed - only error logging supported
    };

    warn = (...data: string[]) => {
        // Removed - only error logging supported
    };

    errorLog = (...data: string[]) => {
    };

}