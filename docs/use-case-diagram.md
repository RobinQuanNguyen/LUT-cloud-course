# User Case Flows

This document describes the system from the user's point of view.

Instead of technical internals, these diagrams focus on:

- what page or interface the user sees
- what the user does next
- how the system reacts

## 1) Unauthenticated User Flow

```mermaid
%%{init: {'flowchart': {'rankSpacing': 28, 'nodeSpacing': 20}}}%%
flowchart TD
    start["User opens the website"] --> session{"Already logged in?"}
    noChoice["No"]
    yesChoice["Yes"]

    session --> noChoice
    session --> yesChoice
    noChoice --> authPage["Show Login / Sign Up page"]
    yesChoice --> chatPage["System shows Chat UI"]

    authPage --> tryChat["User may reload the page"]
    tryChat --> checkSession["Check authentication"]
    checkSession --> redirect["Redirect back to Login page"]

    redirect --> chooseAction{"What does user do?"}
    chooseAction -- "Create account" --> signup["User fills Sign Up form"]
    chooseAction -- "Log in" --> login["User fills Login form"]

    signup --> signupValid{"Input valid?"}
    signupValid -- "No" --> signupError["System shows validation error"]
    signupError --> signup
    signupValid -- "Yes" --> accountCreated["Account created"]

    login --> loginValid{"Credentials valid?"}
    loginValid -- "No" --> loginError["System shows login error"]
    loginError --> login
    loginValid -- "Yes" --> authenticated["User authenticated"]

    accountCreated --> chatPage
    authenticated --> chatPage
```

## 2) Authenticated Chat User Flow

```mermaid
%%{init: {'flowchart': {'rankSpacing': 28, 'nodeSpacing': 40}}}%%
flowchart TD
    start["Authenticated user enters Chat UI"] --> leftPanel["System shows contacts, chats, and profile area"]
    leftPanel --> chooseView{"User action"}

    chooseView -- "View contacts" --> contacts["System shows contact list"]
    chooseView -- "View chats" --> chats["System shows existing chats"]
    chooseView -- "Open profile options" --> profile["System shows profile actions"]

    contacts --> selectContact["User selects a contact"]
    chats --> openChat["User opens an existing conversation"]
    selectContact --> conversation["System shows conversation area"]
    openChat --> conversation

    conversation --> sendChoice{"User wants to send"}
    sendChoice -- "Text message" --> typeMsg["User types a message"]
    sendChoice -- "Image message" --> pickImage["User selects an image"]

    typeMsg --> sendText["User presses send"]
    pickImage --> sendImage["User presses send"]

    sendText --> updatedChat["System updates the conversation"]
    sendImage --> updatedChat
    updatedChat --> continueChat{"Continue using chat?"}

    continueChat -- "Yes" --> chooseView
    continueChat -- "No" --> profile

    profile --> profileAction{"Profile action"}
    profileAction -- "Update profile picture" --> updateProfile["User uploads new profile picture"]
    profileAction -- "Toggle content filter" --> toggleFilter["User changes content filter setting"]
    profileAction -- "Log out" --> logout["User logs out"]

    updateProfile --> chooseView
    toggleFilter --> chooseView
    logout --> loginPage["System returns user to Login page"]
```

## 3) Monitoring User Flow

```mermaid
%%{init: {'flowchart': {'rankSpacing': 28, 'nodeSpacing': 40}}}%%
flowchart TD
    start["User opens Monitoring page"] --> monitorPage["System shows analytics dashboard"]
    monitorPage --> selectRange{"User chooses time filter"}

    selectRange -- "Quick range" --> quickRange["User selects preset range"]
    selectRange -- "Custom range" --> customRange["User enters start and end time"]

    quickRange --> fetch["User presses Search"]
    customRange --> rangeValid{"Both dates provided?"}
    rangeValid -- "No" --> rangeError["System shows validation error"]
    rangeError --> customRange
    rangeValid -- "Yes" --> fetch

    fetch --> load["System loads analytics data"]
    load --> showData["System shows charts, totals, and JSON result"]
    showData --> adjust{"User wants another query?"}

    adjust -- "Yes" --> selectRange
    adjust -- "No" --> finish["User leaves monitoring page"]
```

## Notes

- These are user-centered interaction flows, not technical data flow diagrams.
- The first diagram focuses on a user who is not authenticated yet.
- The second diagram focuses on normal chat usage after login.
- The third diagram focuses on the monitoring page and analytics viewing flow.
