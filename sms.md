# PROJECT: Supermarket Stock Management System

Act as a senior full-stack software engineer. Build a complete, modern, responsive, and functional Supermarket Stock Management System for managing a single supermarket business.

The application must be suitable for real business use, not just a demonstration or static prototype.

## 1. TECHNOLOGY STACK

Use the following technologies:

Frontend:
- React.js
- JavaScript
- Vite
- CSS or Tailwind CSS
- React Router for navigation

Backend:
- Node.js
- Express.js
- REST API architecture

Database:
- Supabase PostgreSQL
- Supabase Authentication

Deployment:
- Vercel

Use the Supabase JavaScript client where appropriate. The frontend must communicate with the Express backend through REST API endpoints for business operations.

## 2. SYSTEM OBJECTIVES

The system should allow the supermarket owner to:
- Manage all supermarket products.
- Add, view, update, and delete products (CRUD).
- Organize products into categories.
- Manage suppliers.
- Record stock purchases and incoming stock.
- Record sales and outgoing stock.
- Monitor available stock quantities.
- Identify low-stock products.
- View sales and inventory reports.
- Monitor business performance through a dashboard.

## 3. MAIN MODULES

### A. Authentication
- Login and logout.
- Secure authentication using Supabase Auth.
- Protect private application routes.
- Include user roles such as Admin and Staff.
- Restrict sensitive operations according to user permissions.

### B. Dashboard
Create an attractive dashboard displaying:
- Total products.
- Total categories.
- Total stock quantity.
- Total sales today.
- Total revenue today.
- Low-stock products.
- Recent sales.
- Recent stock movements.
- Sales performance charts.

Dashboard statistics must come from the actual database, not hardcoded sample numbers.

### C. Product Management (CRUD)

Create a complete product management module.

Each product should have:
- Product ID.
- Product name.
- Barcode.
- Category.
- Description.
- Purchase price.
- Selling price.
- Available quantity.
- Minimum stock level.
- Unit of measurement.
- Expiry date (optional).
- Supplier.
- Created date.

Required operations:
- Create a product.
- Display all products.
- Search products by name or barcode.
- Filter products by category.
- View individual product details.
- Update product information.
- Delete products with appropriate confirmation.

Prevent invalid prices and negative stock quantities.

### D. Category Management (CRUD)

Allow users to:
- Add categories.
- View categories.
- Edit categories.
- Delete categories when safe.

Examples:
- Beverages.
- Food.
- Cosmetics.
- Household products.
- Dairy products.
- Fruits and vegetables.

### E. Supplier Management (CRUD)

Supplier information:
- Supplier name.
- Phone number.
- Email.
- Address.
- Company name.

Implement full CRUD operations.

### F. Stock Management

Implement:
- Stock In: Record newly purchased or received products.
- Stock Out: Record authorized stock reductions.
- Stock adjustments with reasons.
- Stock movement history.
- Current stock quantity.
- Low-stock notifications.

Every stock movement must be recorded with its date, product, quantity, type, and responsible user.

### G. Sales Management

Create a sales interface that allows staff to:
- Search products.
- Select products.
- Add products to a shopping cart.
- Enter quantities.
- Calculate subtotals.
- Calculate the total amount.
- Record completed sales.
- View sales history.
- View individual sale details.

When a sale is completed, the database must automatically reduce the available stock.

Do not allow sales when the requested quantity exceeds available stock.

Use database transactions or safe database functions to ensure stock and sales records remain consistent.

### H. Reports

Generate reports for:
- Daily sales.
- Weekly sales.
- Monthly sales.
- Total revenue.
- Best-selling products.
- Low-stock products.
- Stock movement history.
- Inventory valuation.

Include date filters and charts where appropriate.

## 4. DATABASE DESIGN

Create the following Supabase PostgreSQL tables:

1. profiles
2. categories
3. suppliers
4. products
5. purchases
6. purchase_items
7. sales
8. sale_items
9. stock_movements

Define:
- Primary keys.
- Foreign keys.
- Appropriate data types.
- NOT NULL constraints.
- Unique constraints where necessary.
- Indexes for frequently searched fields.
- Created_at and updated_at timestamps.

Use appropriate relationships between all tables.

Use PostgreSQL functions and transactions for operations that require multiple related database updates.

Provide SQL migration files to create the complete database schema.

Enable Row Level Security (RLS) and implement appropriate policies for authenticated users and their roles.

Never expose the Supabase service role key in frontend code.

## 5. USER INTERFACE DESIGN

Create a professional supermarket management dashboard.

Design requirements:
- Modern and clean interface.
- Professional sidebar navigation.
- Responsive layout for desktop, tablet, and mobile.
- Consistent colors and typography.
- Dashboard statistic cards.
- Well-designed data tables.
- Search and filtering functionality.
- Modal forms for adding and editing records.
- Confirmation dialogs before deleting records.
- Loading indicators.
- Success and error notifications.
- Empty states when no data exists.

Suggested sidebar:
- Dashboard
- Products
- Categories
- Suppliers
- Stock Management
- Purchases
- Sales
- Reports
- Users
- Settings
- Logout

## 6. BACKEND REQUIREMENTS

Build a well-organized Express.js backend.

Use a modular architecture with:
- routes/
- controllers/
- services/
- middleware/
- config/

Create REST API endpoints for:
- Authentication and profiles.
- Products.
- Categories.
- Suppliers.
- Purchases.
- Stock movements.
- Sales.
- Reports.

Requirements:
- Input validation.
- Proper error handling.
- Authentication middleware.
- Role-based authorization.
- Secure environment variable management.
- Appropriate HTTP status codes.
- Consistent JSON responses.

Do not put all backend logic in one file.

## 7. PROJECT STRUCTURE

Organize the application like this:

supermarket-stock-management/
  frontend/
    src/
      components/
      pages/
      layouts/
      services/
      hooks/
      context/
      assets/
      App.jsx
      main.jsx
    package.json

  backend/
    src/
      config/
      controllers/
      routes/
      services/
      middleware/
      server.js
    package.json

  supabase/
    migrations/
    seed.sql

  README.md

  .gitignore

## 8. DEPLOYMENT ON VERCEL

Prepare the project for deployment on Vercel.

Requirements:
- Configure the React frontend for Vercel deployment.
- Configure the Express backend using Vercel-compatible serverless functions.
- Create the necessary vercel.json configuration.
- Configure frontend and backend environment variables.
- Provide instructions for connecting the Supabase project.
- Ensure API requests work correctly after deployment.
- Configure routing and CORS correctly.
- Never commit secrets or API keys.

The frontend and backend may be deployed as separate Vercel projects.

## 9. TESTING AND VALIDATION

Test the following:
- Creating products.
- Viewing products.
- Updating products.
- Deleting products.
- Creating categories and suppliers.
- Recording stock purchases.
- Recording sales.
- Automatic stock updates.
- Low-stock detection.
- Authentication and permissions.
- Report calculations.

Ensure the application uses real Supabase data.

Do not use fake data as a replacement for backend functionality.

## 10. DEVELOPMENT INSTRUCTIONS

Follow these instructions carefully:

1. First inspect the development environment and project directory.
2. Create the project structure.
3. Set up the frontend and backend.
4. Design the database schema and SQL migrations.
5. Implement backend APIs.
6. Implement frontend pages and components.
7. Connect the frontend to the backend.
8. Connect the backend to Supabase.
9. Test all CRUD operations.
10. Prepare deployment configurations and documentation.

Work incrementally and keep the application runnable throughout development.

Do not generate the entire project as disconnected code snippets.

Do not leave important buttons non-functional.

Do not use hardcoded dashboard statistics.

Do not claim a feature is complete until it has been implemented and tested.

If Supabase credentials are not available, create the required environment variable examples and clearly explain how to configure them.

Start by creating the project structure and database schema, then continue implementing the application module by module.

The final result must be a complete, responsive, secure, and deployable Supermarket Stock Management System.