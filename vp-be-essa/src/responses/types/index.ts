class Messages {
  static customerCreated() {
    return "OTP sent";
  }
  static deletedAgent() {
    return "Deleted Agent successfully";
  }
  static deleted() {
    return "Deleted successfully";
  }
  static notDeleted() {
    return "Cannot Delete";
  }
  static complaintRaised() {
    return "Raised complaints";
  }
  static fetchedAdminData() {
    return "fetched Admin Data";
  }
  static addedAdmin() {
    return "Added admin Successfully";
  }
  static mailSent() {
    return "Mail sent successfully";
  }
  static mailNotSent() {
    return "Mail Not Successfully";
  }
  static batteryFlapOpened() {
    return "Opened battery flap";
  }
  static batteryFlapNotOpened() {
    return "Cannot Open battery flap";
  }
  static dataNotFound() {
    return "No data found";
  }
  static addedAmount() {
    return "Added amount";
  }
  static complaintIdReq() {
    return "Complaint ID is required";
  }
  static deletedComplaint() {
    return "Deleted the Complaint";
  }
  static deducedAmount() {
    return "deduced amount";
  }
  static fetchedPaymentData() {
    return "fetched payment data";
  }
  static customerUpdated() {
    return "Customer updated";
  }
  static customerKycUpdated() {
    return "Your Documents are successfully uploaded and currently under review";
  }
  static CustomerNotFound() {
    return "Customer not found";
  }
  static documentsNotUploaded() {
    return "No documents uploaded";
  }
  static badRequest() {
    return "Bad Request";
  }
  static tokenExpired() {
    return "Token Expired";
  }
  static phoneNumberExists() {
    return "Phone Number already exists";
  }
  static unAuthorizedAccess() {
    return "UnAuthorized Access";
  }

  static otpVerified() {
    return "OTP verified";
  }

  static trueCallerVerified() {
    return "TrueCaller verified";
  }
  static genratedNewPassword() {
    return "Generated new password";
  }
  static invalidOtp() {
    return "Invalid OTP";
  }

  static otpNotSent() {
    return "OTP Not Sent";
  }

  static userNotFound() {
    return "User not found";
  }
  static matchConfirmPassword() {
    return "new password doesnt match confirm password";
  }
  static invalidCurrentPassword() {
    return "please enter current password correctly";
  }
  static passwordChanged() {
    return "password Changed Successfully";
  }
  static createdAgent() {
    return "created Agent successfully";
  }
  static fetchedCustomerData() {
    return "fetched customer data";
  }
  static invalidUserName() {
    return "Invalid UserName";
  }
  static invalidPassword() {
    return "Invalid password";
  }
  static loggedIn() {
    return "Logged in successfully";
  }
  static loggedOut() {
    return "Logged out successfully";
  }
  static userNameExists() {
    return "userName already exists";
  }
  static bikeInUse() {
    return "Sorry, Bike is in use";
  }
  static batteryLow() {
    return "Battery Level is Low";
  }
  static deactivatedCustomer() {
    return "Deactivated the customer successfully";
  }
  static customerIdrequired() {
    return "customer Id is required";
  }

  static vehicleNotFound() {
    return "Vehicle not found";
  }
  static isInZone() {
    return "vehicle is parked in zone";
  }
  static isNotInZone() {
    return "vehicle is not parked in zone";
  }
  static geoFencingNotFound() {
    return "Geo fencing area details not found";
  }
  static notUpdated() {
    return "Cannot update Geofence";
  }
  static notAdded() {
    return "Cannot add Geofence";
  }
  static fetchedAgentData() {
    return "Fetched agent data";
  }
  static fetchedcomplaintsData() {
    return "Fetched complaints data";
  }
  static updatedInfoSuccessfully() {
    return "Successfully Updated";
  }
  static success() {
    return "Success";
  }
  static tokenGenerated() {
    return "Success";
  }
  static rideHistoryFetched() {
    return "Fetched Ride History";
  }
  static rideSummaryFetched() {
    return "Fetched Ride Summary";
  }
  static rideFeedback() {
    return "Ride feedback submitted";
  }
  static fetchedRideData() {
    return "Ride Data fetched";
  }
  static fetchedKycData() {
    return "Fetched Kyc data";
  }
  static tripInitialized() {
    return "Trip initiated";
  }
  static tripStarted() {
    return "Trip started";
  }
  static tripNotInitialized() {
    return "Trip not intiated";
  }

  static invalidCouponId() {
    return "Invalid Coupon Id";
  }

  static transactionSuccess() {
    return "Transaction Success";
  }
  static invalidVehicleNumber() {
    return "Invalid Vehicle Number";
  }

  static paymentOrderSuccess() {
    return "Order Success";
  }

  static paymentOrderFailed() {
    return "Order failed";
  }

  static paymentFailed() {
    return "Payment Failed";
  }

  static paymentSuccess() {
    return "Payment Success";
  }

  static lowWalletBalance() {
    return "Low Wallet Balance";
  }

  static rideNotEnded() {
    return "Ride Not ended";
  }
  static vehicleUnlocked() {
    return "Vehicle Unlocked";
  }
  static vehicleLocked() {
    return "Vehicle Locked";
  }
  static vehicleNotUnlocked() {
    return "Vehicle Not Unlocked";
  }
  static vehicleNotLocked() {
    return "Vehicle Not Locked";
  }
  static rideEnded() {
    return "Ride ended";
  }
  static activatedCustomer() {
    return "Activated Customer";
  }
  static deactivatedVehicle() {
    return "Deactivated Vehicle";
  }
  static invalidToken() {
    return "Invalid token";
  }
  static customerDeactivated() {
    return "Your account has been de-activated. Please contact customer support";
  }
  static tripNotFound() {
    return "Trip not exist";
  }
  static redzoneAlert() {
    return "You cannot end ride in Red Zone,\nPlease park the vehicle in Blue or Green zone";
  }
  static bluezoneAlert() {
    return "You cannot end ride outside Blue zone,\nPlease park the vehicle in Blue or Green zone";
  }

  static invalidPromocode() {
    return "Promocode Invalid";
  }

  static resendOtp() {
    return "OTP Resent";
  }

  static rideNotFound() {
    return "Ride not exist";
  }

  static tripAlreadyExist() {
    return "Trip already exist";
  }

  static invalidPhoneNumber() {
    return "Invalid Phone number";
  }

  static logoutSuccess() {
    return "Logged out successfully";
  }

  static couponApplied(amount: any) {
    return `Your account has been credited with Rs.${amount}`;
  }

  static vehicleDeativated(reason: any) {
    return `${reason}`;
  }
}

module.exports = Messages;
