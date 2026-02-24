import mongoose from 'mongoose';
import Permission from '../model/Permission.js';
import dotenv from 'dotenv';

dotenv.config();

// All permissions for all admin panel tabs with CRUD operations
const permissions = [
  // Dashboard
  {
    name: 'view_dashboard',
    description: 'View dashboard',
    category: 'dashboard'
  },
  
  // Users
  {
    name: 'view_users',
    description: 'View users list',
    category: 'users'
  },
  {
    name: 'add_users',
    description: 'Add new users',
    category: 'users'
  },
  {
    name: 'edit_users',
    description: 'Edit user information',
    category: 'users'
  },
  {
    name: 'delete_users',
    description: 'Delete users',
    category: 'users'
  },
  
  // Clients
  {
    name: 'view_clients',
    description: 'View client list and details',
    category: 'clients'
  },
  {
    name: 'add_clients',
    description: 'Add new clients',
    category: 'clients'
  },
  {
    name: 'edit_clients',
    description: 'Edit client information',
    category: 'clients'
  },
  {
    name: 'delete_clients',
    description: 'Delete clients',
    category: 'clients'
  },
  {
    name: 'view_client_details',
    description: 'View detailed client information',
    category: 'clients'
  },
  {
    name: 'export_clients',
    description: 'Export client data',
    category: 'clients'
  },
  {
    name: 'search_clients',
    description: 'Search and filter clients',
    category: 'clients'
  },
  {
    name: 'view_client_name',
    description: 'View client name',
    category: 'clients'
  },
  {
    name: 'view_client_email',
    description: 'View client email',
    category: 'clients'
  },
  {
    name: 'view_client_phone',
    description: 'View client phone number',
    category: 'clients'
  },
  {
    name: 'view_projects',
    description: 'View client projects',
    category: 'clients'
  },
  {
    name: 'add_projects',
    description: 'Add client projects',
    category: 'clients'
  },
  {
    name: 'edit_projects',
    description: 'Edit client projects',
    category: 'clients'
  },
  {
    name: 'delete_projects',
    description: 'Delete client projects',
    category: 'clients'
  },
  {
    name: 'view_payment_history',
    description: 'View client payment history',
    category: 'clients'
  },
  {
    name: 'add_payment_history',
    description: 'Add client payment history',
    category: 'clients'
  },
  {
    name: 'edit_payment_history',
    description: 'Edit client payment history',
    category: 'clients'
  },
  {
    name: 'delete_payment_history',
    description: 'Delete client payment history',
    category: 'clients'
  },
  {
    name: 'view_hosting_domain',
    description: 'View client hosting and domain information',
    category: 'clients'
  },
  {
    name: 'add_hosting_domain',
    description: 'Add hosting and domain records',
    category: 'clients'
  },
  {
    name: 'edit_hosting_domain',
    description: 'Edit hosting and domain records',
    category: 'clients'
  },
  {
    name: 'delete_hosting_domain',
    description: 'Delete hosting and domain records',
    category: 'clients'
  },
  {
    name: 'view_client_assets',
    description: 'View client assets',
    category: 'clients'
  },
  {
    name: 'add_client_assets',
    description: 'Add client assets',
    category: 'clients'
  },
  {
    name: 'edit_client_assets',
    description: 'Edit client assets',
    category: 'clients'
  },
  {
    name: 'delete_client_assets',
    description: 'Delete client assets',
    category: 'clients'
  },
  
  // Packages
  {
    name: 'view_packages',
    description: 'View package list and details',
    category: 'packages'
  },
  {
    name: 'add_packages',
    description: 'Add new packages',
    category: 'packages'
  },
  {
    name: 'edit_packages',
    description: 'Edit package information',
    category: 'packages'
  },
  {
    name: 'delete_packages',
    description: 'Delete packages',
    category: 'packages'
  },
  
  // Employees
  {
    name: 'view_employees',
    description: 'View employees list',
    category: 'employees'
  },
  {
    name: 'add_employees',
    description: 'Add new employees',
    category: 'employees'
  },
  {
    name: 'edit_employees',
    description: 'Edit employee information',
    category: 'employees'
  },
  {
    name: 'delete_employees',
    description: 'Delete employees',
    category: 'employees'
  },
  
  // Salary
  {
    name: 'view_salary',
    description: 'View salary records',
    category: 'salary'
  },
  {
    name: 'add_salary',
    description: 'Add salary records',
    category: 'salary'
  },
  {
    name: 'edit_salary',
    description: 'Edit salary records',
    category: 'salary'
  },
  {
    name: 'delete_salary',
    description: 'Delete salary records',
    category: 'salary'
  },
  
  // Payment Generator / Invoice Generator
  {
    name: 'view_payment_generator',
    description: 'View payment generator',
    category: 'payments'
  },
  {
    name: 'use_payment_generator',
    description: 'Generate payment links',
    category: 'payments'
  },
  
  // Custom Packages
  {
    name: 'view_custom_packages',
    description: 'View custom packages',
    category: 'custom_packages'
  },
  {
    name: 'add_custom_packages',
    description: 'Add custom packages',
    category: 'custom_packages'
  },
  {
    name: 'edit_custom_packages',
    description: 'Edit custom packages',
    category: 'custom_packages'
  },
  {
    name: 'delete_custom_packages',
    description: 'Delete custom packages',
    category: 'custom_packages'
  },
  
  // Inquiries
  {
    name: 'view_inquiries',
    description: 'View inquiries',
    category: 'inquiries'
  },
  {
    name: 'add_inquiries',
    description: 'Add new inquiries',
    category: 'inquiries'
  },
  {
    name: 'edit_inquiries',
    description: 'Edit inquiries',
    category: 'inquiries'
  },
  {
    name: 'delete_inquiries',
    description: 'Delete inquiries',
    category: 'inquiries'
  },
  {
    name: 'convert_inquiries',
    description: 'Convert inquiries to clients',
    category: 'inquiries'
  },
  
  // Call Schedule
  {
    name: 'view_schedule_calls',
    description: 'View scheduled calls',
    category: 'schedule_calls'
  },
  {
    name: 'add_schedule_calls',
    description: 'Schedule new calls',
    category: 'schedule_calls'
  },
  {
    name: 'edit_schedule_calls',
    description: 'Edit scheduled calls',
    category: 'schedule_calls'
  },
  {
    name: 'delete_schedule_calls',
    description: 'Delete scheduled calls',
    category: 'schedule_calls'
  },
  
  // Expenses
  {
    name: 'view_expenses',
    description: 'View expenses',
    category: 'expenses'
  },
  {
    name: 'add_expenses',
    description: 'Add expenses',
    category: 'expenses'
  },
  {
    name: 'edit_expenses',
    description: 'Edit expenses',
    category: 'expenses'
  },
  {
    name: 'delete_expenses',
    description: 'Delete expenses',
    category: 'expenses'
  },
  
  // Disputes
  {
    name: 'view_disputes',
    description: 'View disputes',
    category: 'disputes'
  },
  {
    name: 'add_disputes',
    description: 'Add disputes',
    category: 'disputes'
  },
  {
    name: 'edit_disputes',
    description: 'Edit disputes',
    category: 'disputes'
  },
  {
    name: 'delete_disputes',
    description: 'Delete disputes',
    category: 'disputes'
  },
  
  // Reports
  {
    name: 'view_reports',
    description: 'View reports',
    category: 'reports'
  },
  {
    name: 'export_reports',
    description: 'Export reports',
    category: 'reports'
  },
  
  // Permissions
  {
    name: 'view_permissions',
    description: 'View permissions',
    category: 'permissions'
  },
  {
    name: 'manage_permissions',
    description: 'Manage user permissions',
    category: 'permissions'
  },
  
  // Activity Logs
  {
    name: 'view_activity_logs',
    description: 'View activity logs',
    category: 'activity_logs'
  },
  
  // 2FA Settings
  {
    name: 'view_2fa_settings',
    description: 'View 2FA settings',
    category: '2fa_settings'
  },
  {
    name: 'manage_2fa_settings',
    description: 'Manage 2FA settings',
    category: '2fa_settings'
  },
  
  // Emails
  {
    name: 'view_emails',
    description: 'View assigned emails',
    category: 'emails'
  },
  {
    name: 'send_emails',
    description: 'Send emails from assigned accounts',
    category: 'emails'
  },
  
  // Messaging
  {
    name: 'allow_message',
    description: 'Allow messaging functionality',
    category: 'messaging'
  },
  {
    name: 'allow_message_with_client',
    description: 'Allow messaging with clients',
    category: 'messaging'
  },
  {
    name: 'allow_message_with_users',
    description: 'Allow messaging with users',
    category: 'messaging'
  }
];

async function seedPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if permissions already exist
    const existingPermissions = await Permission.find();
    
    if (existingPermissions.length > 0) {
      console.log(`Found ${existingPermissions.length} existing permissions.`);
      
      // Get existing permission names
      const existingNames = new Set(existingPermissions.map(p => p.name));
      
      // Find permissions that need to be added
      const permissionsToAdd = permissions.filter(p => p.name && !existingNames.has(p.name));
      
      if (permissionsToAdd.length > 0) {
        await Permission.insertMany(permissionsToAdd);
        console.log(`Added ${permissionsToAdd.length} new permissions.`);
      } else {
        console.log('All permissions already exist.');
      }
      
      // Update existing permissions with latest descriptions/categories
      for (const permission of permissions) {
        if (permission.name) {
          await Permission.updateOne(
            { name: permission.name },
            { 
              $set: { 
                description: permission.description,
                category: permission.category
              }
            }
          );
        }
      }
      console.log('Updated existing permission details.');
    } else {
      // No permissions exist, insert all
      const validPermissions = permissions.filter(p => p.name);
      await Permission.insertMany(validPermissions);
      console.log(`Inserted ${validPermissions.length} permissions.`);
    }

    console.log('Permission seeding completed successfully!');
    console.log(`Total permissions: ${permissions.filter(p => p.name).length}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
}

seedPermissions();


