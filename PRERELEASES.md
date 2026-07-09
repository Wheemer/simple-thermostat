# Trying Prereleases With HACS

Prereleases are test builds for users who want to help verify fixes before they are promoted to the normal release channel.

If you only want the regular stable version, you do not need to do anything here.

## Enable Prerelease Updates

HACS creates a switch entity for each tracked repository. That switch controls whether Home Assistant should include prereleases when checking for updates.

1. Open **Settings** in Home Assistant.
2. Go to **Devices & services**.
3. Open the **Entities** tab.
4. Search for `simple thermostat`.
5. Find the disabled HACS switch for **Simple Thermostat**.
6. Open the entity and enable it.
7. Turn the switch on.
8. Go back to **HACS**, open **Simple Thermostat**, and check for updates.

When the switch is on, HACS can offer prerelease versions newer than the latest stable release. When the switch is off, HACS stays on the normal release channel.

## Install A Specific Prerelease

If HACS does not immediately offer the prerelease:

1. Open **HACS**.
2. Open **Simple Thermostat**.
3. Use the menu in the top right.
4. Choose **Redownload**.
5. Choose **Need a different version?** if shown.
6. Select the prerelease version.
7. Download it and refresh Home Assistant.

After installing or changing versions, refresh the dashboard. If the old card is still loaded, clear the browser cache or restart the Home Assistant frontend session.

## Go Back To Stable

1. Turn the Simple Thermostat HACS prerelease switch off.
2. Open **HACS**.
3. Open **Simple Thermostat**.
4. Redownload the latest stable release.
5. Refresh Home Assistant.
