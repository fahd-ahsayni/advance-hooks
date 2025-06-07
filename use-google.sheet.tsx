import { useCallback, useState } from "react";

interface UseGoogleSheetsOptions<T = Record<string, any>> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  validateRequired?: (keyof T)[];
  transformData?: (data: T) => Record<string, any>;
}

interface UseGoogleSheetsReturn<T = Record<string, any>> {
  submitToSheet: (data: T) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export const useGoogleSheets = <
  T extends Record<string, any> = Record<string, any>
>({
  onSuccess,
  onError,
  validateRequired = [],
  transformData,
}: UseGoogleSheetsOptions<T> = {}): UseGoogleSheetsReturn<T> => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  const validateData = useCallback(
    (data: T): string | null => {
      for (const field of validateRequired) {
        if (!data[field] || String(data[field]).trim() === "") {
          return `${String(field)} is required`;
        }
      }
      return null;
    },
    [validateRequired]
  );

  const submitToSheet = useCallback(
    async (data: T) => {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      // Validate required fields
      const validationError = validateData(data);
      if (validationError) {
        setError(validationError);
        setIsSubmitting(false);
        return;
      }

      const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;

      if (!scriptUrl) {
        setError("Google Script URL not configured in environment variables");
        setIsSubmitting(false);
        return;
      }

      try {
        const url = new URL(scriptUrl);

        // Transform data if transformer provided, otherwise use as-is
        const finalData = transformData ? transformData(data) : data;

        // Add all data as URL parameters
        Object.entries(finalData).forEach(([key, value]) => {
          url.searchParams.append(key, String(value || ""));
        });

        await fetch(url.toString(), {
          method: "GET",
          mode: "no-cors",
        });

        setSuccess(true);
        onSuccess?.(data);
      } catch (err) {
        console.error("Submit error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to submit data";
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, onError, validateData, transformData]
  );

  return {
    submitToSheet,
    isSubmitting,
    error,
    success,
    reset,
  };
};

/*
 *@description Google Apps Script code to handle GET requests and save data to a Google Sheet
 * This code should be deployed as a web app in Google Apps Script
 */
/*
function doGet(e) {
  // More robust parameter handling
  const params = (e && e.parameter) ? e.parameter : {};
  
  console.log('All received data:', JSON.stringify(params));
  
  try {
    const data = {
      name: params.name || '',
      email: params.email || '',
      age: params.age || '',
      timestamp: params.timestamp || new Date().toISOString(),
    };
    
    console.log('Processed data:', data);
    
    // Skip validation if it's a test parameter
    if (params.test || params.debug) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Test successful',
          received: params
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheetId = '1c4U2Zmwphw9JmzjQBWUSluXTCuy7N-BKYjVM5wSjvgs';
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Age']);
    }
    
    sheet.appendRow([data.timestamp, data.name, data.email, data.age]);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Data saved to sheet',
        rowCount: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
*/
