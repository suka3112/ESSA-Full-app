import { financeRoutes } from './financeRoutes'
import { vendorRoutes } from './vendorRoutes'
import { adminRoutes } from './adminRoutes'
import { businessRoutes } from './businessRoutes'
const routers = [...vendorRoutes, ...financeRoutes, ...businessRoutes, ...adminRoutes]

export default routers
