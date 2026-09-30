import { NormalButton } from "components/Common";
import TableComponent from "components/Common/TableComponent";
import React, { useEffect, useState } from "react";
import "./style.scss";
import { InputBox } from "components/Common/InputBox";
import { Controller, useForm } from "react-hook-form";
import CustomModal from "components/Common/Modal";
import { SelectBox } from "components/Common/SelectBox";
import tooltip from "../../../../assets/icons/tooltip.svg";
import { SearchInputTable } from "components/Common/TableComponent/TableComponent.style";
import SearchInput from "components/Common/SearchInput";
import {
  getUserDetails,
  addSubUser,
  deleteUser,
  editUserStatus,
} from "api/MyProfile";
import { showToast } from "../../../../redux/actions/toastActions";
import { connect, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { vendorRole } from "services/helpers/constants/common";
import { Validator } from "services/validation/formValidations";
import SuccessPopup from "components/Common/SuccessPopup";
import useTableFeatures from "hooks/useTableFeatures";
import TableLayout from "components/Common/TableComponent/TableLayout";
import { BUSINESS_USER_TYPE, FINANCE_USER_TYPE } from "constants/userType";
import ToggleSwitch from "components/Common/ToggleSwitch";
import { ADMIN_USER_TYPE, VENDOR_USER_TYPE } from "constants/userType";
import { editUserManagement, getUserById } from "api/UserManagement";
import { toast } from "react-toastify";

const UsersComp = ({ showToast, userInfo: { userType }, myProfile }) => {
  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset,
  } = useForm();
  const [addUser, setAddUser] = useState(false);
  const [isEditUser, setIsEditUser] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [empId, setEmpId] = useState(null);

  const { t } = useTranslation(['myprofile', "extension", "login", "vendors", "toast"]);
  const [userSuccessPopup, setUserSuccessPopup] = useState(false);
  const {
    page,
    rowsPerPage,
    search,
    order,
    orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    tableProps,
  } = useTableFeatures();
  const vendorUserType = useSelector((state) => state?.userInfo?.Vendor_Role);
  const vendor_id = myProfile?.bankDetails?.Vendor_Id;

  useEffect(() => {
    fetchUserList();
  }, [page, rowsPerPage, search, order, orderBy]);

  const fetchUserList = () => {
    setLoader(true);
    let query = {
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      vendor_id: vendor_id,
      sort: order,
      sort_column: orderBy,
    };
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === "All") delete query[key];
    });
    getUserDetails(query)
      .then((res) => {
        setUserData(res?.data?.data?.results);
        setPageMeta(res?.data?.data?.pageMeta);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoader(false);
      });
  };

  const handleAddUser = () => {
    setAddUser(true);
    reset({
      name: "",
      email: "",
      role: "",
    });
  };

  const handleCancelSubmit = () => {
    setAddUser(false);
    setIsEditUser(false);
    reset();
  };

  const onSubmit = (data) => {
    setIsLoading(true);
    let payload = {
      Name: data?.name,
      Email: data?.email,
      Vendor_Role: data?.role,
      Vendor_Id: vendor_id,
    };
    addSubUser(payload)
      .then((res) => {
        setAddUser(false);
        //showToast('User Added Successfully.', '', 'success')
        fetchUserList();
        setUserSuccessPopup(true);
      })
      .catch((err) => {
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message || t("failedToAddUser"));
      })
      .finally(() => {
        setIsLoading(false);
        reset();
      });
  };

  const handleConfirmDelete = () => {
    let query = {
      isUser: true,
    };
    deleteUser(empId, query)
      .then((res) => {
        setIsModalOpen(false);
        setEmpId(null);
        fetchUserList();
      })
      .catch((err) => {
        console.error("Error deleting user:", err);
      });
  };

  const handleEdit = async (user) => {
    setIsEditUser(true);
    let query = {
      isUser: true,
    };

    try {
      const resp = await getUserById(user?.ID, query);
      const userDetails = resp?.data?.data;

      if (userDetails) {
        reset({
          name: userDetails.Name,
          email: userDetails.Email,
          role: userDetails.Role_id,
        });
      }
    } catch (err) {
      console.error("Failed to fetch user details:", err);
    }
  };

  const handleDelete = (employeeId) => {
    setIsModalOpen(true);
    setModalMessage("Are you sure want to delete this Account?");
    setEmpId(employeeId);
  };

  const handleToggleStatus = async (employeeId, newStatus) => {
    try {
      setLoader(true);
      let query = {
        ID: employeeId,
        Is_Active: newStatus,
        isUser: true,
      };
      editUserStatus(query)
        .then((res) => {
          showToast(
            t('toast:successTitle'),
            `${t("vendors:userStatusUpdatedTo")} ${
              newStatus ? t("vendors:active") : t("vendors:inactive")
            }`,
            "success"
          );
          //toast.success(`${t('vendors:userStatusUpdatedTo')} ${newStatus ? 'Active' : 'Inactive'}`);
          fetchUserList();
        })
        .catch((error) => {
          console.error("Error updating status:", error);
          toast.error(
            error.response?.data?.message || t("vendors:failedToUpdateStatus")
          );
        })
        .finally(() => {
          fetchUserList();
        });
    } finally {
      setLoader(false);
    }
  };

  const headers = [
    { key: 'sNo', label: t('serialNumber') },
    { key: 'name', label: t('name') },
    { key: 'role', label: t('role') },
    { key: 'email', label: t('email') },
    { key: 'statuses', label: t('status') },
    // ...(
    //   userType === ADMIN_USER_TYPE
    //     ? [{ key: 'action', label: 'Action' }]
    //     : []
    // )
  ]

  const formattedUserData = userData
    ? userData.map((user, index) => {
        const row = {
          sNo: (page - 1) * rowsPerPage + index + 1,
          name: user?.Name,
          role: user?.Vendor_Role,
          email: user?.Email,
          statuses:
            userType === ADMIN_USER_TYPE || userType === VENDOR_USER_TYPE ? (
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  //customclassName="!w-12"
                  defaultValue={user.Is_Active}
                  onToggle={(newStatus) =>
                    handleToggleStatus(user.ID, newStatus)
                  }
                />
                <span className="text-sm font-medium">
                  {user.Is_Active ? "Active" : "Inactive"}
                </span>
              </div>
            ) : (
              user?.statusus?.Status_classification
            ),
        };

      if (userType === ADMIN_USER_TYPE) {
        // row.action = {
        //   edit: () => handleEdit(user),
        //   delete: () => handleDelete(user.ID)
        // }
      }

        return row;
      })
    : [];

  const modalStyles = {
    padding: "48px",
  };

  const nameValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoNumbers()
    .validateNoSymbols()
    .validateMinLength(2)
    .validateMaxLength(100)
    .build();

  const emailValidator = new Validator()
    .validateNotEmptySpace()
    .validateEmail()
    // .validateMaxLength(241)
    .build();
  return (
    <div className="users-container bg-white">
      <div className="sub-header mb-0">
        <div className={`headerTitle fs-5`}>
          {t("extension:userDetails")}
        </div>
        <div>
          <SearchInput
            placeholder={t("searchNameOrEmail")}
            onChange={(value) => handleSearchValue(value)}
          />
          {userType !== FINANCE_USER_TYPE &&
            userType !== BUSINESS_USER_TYPE &&
            vendorUserType == "Admin" && (
              <NormalButton
                isPrimary
                label={t("addNewUser")}
                customClass="w-[150px]"
                onClick={handleAddUser}
              />
            )}
        </div>
      </div>
      <TableLayout
        tableData={formattedUserData}
        tableHeaders={headers}
        {...tableProps}
      />
      <CustomModal
        open={addUser || isEditUser}
        onClose={handleCancelSubmit}
        closeIcon
        modalStyles={modalStyles}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <p className="addUserTitle mb-4">
            {userType === ADMIN_USER_TYPE && isEditUser
              ? t("editUser")
              : t("addNewUser")}
          </p>
          <div className="mb-3">
            <InputBox
              titleLabel={t("name")}
              className="signInInputUser inputBox mb-0"
              name="name"
              type="text"
              placeholder={t("name")}
              register={register}
              error={errors.name}
              rules={{
                required: t("nameRequired"),
                validate: (value) => nameValidator(t("name"), value),
              }}
              maxLength={100}
              isRequired
              tooltipIcon
            />
          </div>
          <div className="mb-3">
            <InputBox
              titleLabel={t("email")}
              className="signInInputUser inputBox mb-0"
              name="email"
              type="text"
              placeholder={t("email")}
              rules={{
                required: t("login:email.error"),
                validate: (value) => {
                  if (value.length > 241)
                    return "Email cannot exceed 241 characters";
                  return emailValidator(t("email"), value);
                },
              }}
              maxLength={241}
              register={register}
              error={errors.email}
              isRequired
              tooltipIcon
            />
          </div>
          <Controller
            name="role"
            control={control}
            rules={{ required: t("roleRequired") }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="select-container">
                <SelectBox
                  className="custom-select-box mt-1"
                  error={error}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  options={vendorRole}
                  name="role"
                  isRequired
                  placeholder={t('selectRole')}
                  tooltipIcon
                  titleLabel={t("role")}
                />
              </div>
            )}
          />
          <div className="my-4 w-100">
            <NormalButton
              label={
                userType === ADMIN_USER_TYPE && isEditUser
                  ? "Update"
                  : t("addUser")
              }
              isPrimary
              isLoading={isLoading}
              disabled={isLoading}
              type="submit"
              customClass="w-100"
            />
          </div>
        </form>
      </CustomModal>
      {userSuccessPopup && (
        <SuccessPopup
          open={userSuccessPopup}
          successMsg={t('newUserAdded')}
          subText={t('newUserAddedSuccess')}
          onClose={() => setUserSuccessPopup(false)}
        />
      )}
      <CustomModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEmpId(null);
        }}
        modalStyles={{ width: 900 }}
        closeIcon
      >
        <p className="modalTxt">{modalMessage}</p>
        <div className="d-flex justify-content-between my-3">
          <NormalButton
            label={t("otp:cancel")}
            outlineBtn
            customClass="navigation-buttons"
            onClick={() => {
              setIsModalOpen(false);
              setEmpId(null);
            }}
          />
          <NormalButton
            label={t("otp:confirm")}
            isPrimaryModal
            customClass="navigation-buttons"
            onClick={handleConfirmDelete}
          />
        </div>
      </CustomModal>
    </div>
  );
};

const mapDispatchToProps = {
  showToast,
};
const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  myProfile: state.myProfile.profileData,
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersComp);
