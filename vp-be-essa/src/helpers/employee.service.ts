import { Op, Sequelize } from "sequelize";
import { Employee } from "../models/employee";
import { User } from "../models/user";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { generatePassword } from "../utils/globalFunction";
import pagination from "../utils/pagination";
import { UserRole } from "../models/userRole";

class EmployeeService {
  async addEmployee(empDetails: any) {
    try {
      if (!empDetails?.password)
        throw new APIError(
          "password field is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      const { password, hashPassword } = await generatePassword(
        empDetails?.password,
      );
      const emp = await Employee.create({
        Employee_Code: empDetails?.empCode,
        Department: empDetails?.department,
        Designation: empDetails?.designation,
        Email: empDetails?.email,
        CoCd: empDetails?.entity_id,
        Phone_Number: empDetails?.phone_number,
      });

      const isEssaUatUser =
        typeof empDetails?.email === "string" &&
        empDetails.email.toLowerCase().endsWith("@essa.com");

      await User.create({
        Name: empDetails?.name,
        CoCd: empDetails?.entity_id,
        Employee_Id: emp?.ID,
        Employee_Code: emp?.Employee_Code,
        Email: emp?.Email,
        Password: hashPassword,
        Phone_Number: emp?.Phone_Number,
        Role_id: empDetails?.roleId,
        Primary_User: isEssaUatUser || empDetails?.primaryUser === true,
        Is_CR_Approved: true,
        CR_Approved_date: Sequelize.literal("NOW()"),
        Is_Manager_Approved: true,
        Manager_Approved_Dt: Sequelize.literal("NOW()"),
        Is_Active: true,
        Is_User: true,
        Is_Supplier: empDetails?.Is_Supplier,
      });
      return true;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEmployee({
    page,
    limit,
    search,
    status,
    role,
    endDate,
    sort,
    sort_column,
    startDate,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "ID":
          order.push(["ID", sortDirection]);
          break;
        case "Name":
          order.push(["Name", sortDirection]);
          break;
        case "Email":
          order.push(["Email", sortDirection]);
          break;
        case "Role_id":
          order.push(["Role_id", sortDirection]);
          break;
        case "Is_Active":
          order.push(["Is_Active", sortDirection]);
          break;
        case "Employee_Id":
          order.push(["Employee_Id", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let where: any = {
        Employee_Id: {
          [Op.ne]: null,
        },
        Employee_Code: {
          [Op.ne]: null,
        },
        Is_Deleted: false,
      };

      if (search) {
        where[Op.or] = [
          { Name: { [Op.like]: `%${search}%` } },
          { Email: { [Op.like]: `%${search}%` } },
        ];
      }

      if (status) {
        where.Is_Active = status;
      }

      if (role) {
        where.Role_id = role;
      }

      if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);
        where.CreatedDt = {
          [Op.between]: [start, end],
        };
      }

      const employee = await User.findAndCountAll({
        where: where,
        attributes: [
          "ID",
          "Name",
          "Email",
          "Role_id",
          "Is_Active",
          "Employee_Id",
        ],
        include: [
          {
            model: Employee,
            as: "employee",
            required: false,
          },
          {
            model: UserRole,
            as: "user_role",
            attributes: ["ID", "Role_Name_EN"],
            required: false,
          },
        ],
        limit: limitNumber,
        offset: offset,
        order: order,
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        employee,
      );
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEmployeeById(empId: number) {
    try {
      const employeeDetails = await User.findOne({
        where: {
          Employee_Id: empId,
        },
        include: {
          model: Employee,
          as: "employee",
        },
      });
      return employeeDetails;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getEmployeeByIdV2(empId: number) {
    try {
      const employeeDetails = await User.findOne({
        where: {
          Employee_Id: empId,
          Is_Deleted: false,
          Vendor_Id: null,
        },
      });
      return employeeDetails;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getUsersById(empId: number) {
    try {
      const employeeDetails = await User.findOne({
        where: {
          ID: empId,
        },
      });
      return employeeDetails;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateEmployee(empDetails: any) {
    try {
      if (!empDetails?.Id) {
        throw new APIError(
          "Employee_Id is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const employee = await Employee.findByPk(empDetails?.Id);
      if (!employee)
        throw new APIError(
          "Invalid employee ID",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      // Update Employee table
      await employee?.update({
        Employee_Code: empDetails?.empCode,
        Department: empDetails?.department,
        Designation: empDetails?.designation,
        Email: empDetails?.email,
        CoCd: empDetails?.entity_id,
        Phone_Number: empDetails?.phone_number,
      });

      // Update User table
      const userData: any = {
        Name: empDetails?.name,
        CoCd: empDetails?.entity_id,
        Employee_Code: empDetails?.empCode,
        Email: empDetails?.email,
        Phone_Number: empDetails?.phone_number,
        Role_id: empDetails?.roleId,
        Is_Active: empDetails?.Is_Active,
        Is_Supplier: empDetails?.Is_Supplier,
      };

      await User.update(userData, {
        where: { Employee_Id: empDetails?.Id },
      });

      return true;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateUser(empDetails: any) {
    try {
      const payload = empDetails ?? {};
      payload.Status = 4;
      let updateuser = await User.update(payload, {
        where: { ID: empDetails?.ID, Vendor_Id: null },
      });

      return { status: true, data: updateuser };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateAdditionalUser(empDetails: any) {
    try {
      const payload = empDetails ?? {};
      payload.Status = 4;
      let updateuser = await User.update(payload, {
        where: { ID: empDetails?.ID },
      });

      return { status: true, data: updateuser };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteEmployee(empId: number) {
    try {
      const employee = await Employee.findByPk(empId);
      if (!employee)
        throw new APIError(
          "Invalid employee Id",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      await User.update(
        {
          Is_Deleted: true,
        },
        {
          where: {
            Employee_Id: employee?.ID,
          },
        },
      );
      await employee?.destroy();

      return true;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteUsers(empId: number) {
    try {
      await User.update(
        {
          Is_Deleted: true,
        },
        {
          where: {
            ID: empId,
          },
        },
      );

      return true;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }
}

export default new EmployeeService();
