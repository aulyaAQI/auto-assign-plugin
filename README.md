# Auto Assign Plugin Documentation

## Overview

The Auto Assign Plugin is a powerful tool that allows you to automatically assign tasks or issues to specific users based on predefined rules. This plugin is designed to streamline your workflow and improve efficiency by automating the assignment process. This customization works on both desktop and mobile.

## Installation

To install the Auto Assign Plugin, follow these steps:

1. Download this source code
2. Run this command to install all dependencies.

   ```
   npm i
   ```

3. Run this command within the root directory of extracted .zip to upload directly the plugin.zip to your kintone domain.

   ```
   npm start
   ```

or

1. Open your kintone application and navigate to the "Plugin Management" section.
2. Click on the "Upload Plugin" button and select the downloaded plugin package.
3. Select the plugin.zip from the dist folder on this root after you run build.
4. Once the plugin is uploaded, click on the "Install" button to activate it.

Install plugin in your desired kintone app.

## Configuration

After installing the Auto Assign Plugin, you need to configure it to define the assignment rules. Here's how you can do it:

1. Open your kintone application and navigate to the "Plugin Management" section.
2. Find the Auto Assign Plugin and click on the "Settings" button.
3. In the settings page, you will see a list of available rules.
4. Setup the fields needed for source and reference apps.
5. Click on the "Add Rule" button to create a new rule or "Remove Rule" as desired.
6. Specify the conditions for the rule, such as field values and criteria.
7. Order the priority, except for the threshold field (it will be first priority).
8. Save the rule and repeat the process to add more rules if needed.

## Usage

Once the Auto Assign Plugin is configured, it will automatically assign tasks or issues based on the defined rules. Here's how it works:

1. Create a new task or issue in your kintone application.
2. Fill in the necessary details and save the record.
3. The Auto Assign Plugin will evaluate the record against the defined rules.
4. If a matching rule is found, the task or issue will be assigned to the specified user or group.
5. You can view the assigned tasks or issues in the respective user's or group's task list.

## Kintone Apps Template

You can use these files to test the auto assign feature. Note that you still need to configure the plugin in settings page.

Inside the kintone-template-apps:

1. Order Management - as source
2. Purchase Order - as destination

## Troubleshooting

If you encounter any issues with the Auto Assign Plugin, here are some common troubleshooting steps:

1. Check the plugin settings to ensure that the rules are correctly configured.
2. Verify that the field values and criteria in the rules match the record data.
3. Make sure that the plugin is properly installed and activated.
4. If the issue persists, contact the plugin support team for further assistance.

That's it! You now have a comprehensive guide on how to use the Auto Assign Plugin. Happy automating!
