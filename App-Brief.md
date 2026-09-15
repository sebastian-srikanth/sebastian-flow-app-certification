---
appName: "Asset 360 Investigation Workspace"
externalId: "workspace"
infra: "appsApi"
customer: "Cognite Flows Builder Certification (publicdata / publicdatacdm)"
tier: "Tier 1: Monitoring & reporting"
owner: "Sebastian Srikanth Kumar Selvaraj <sebastian.selvaraj@cognitedata.com>"
userCount: ""
businessValue: ""
milestones: ""
repoUrl: "https://github.com/sebastian-srikanth/sebastian-flow-app-certification"
userRole: "This application is designed for an Operations Analyst (or Reliability Engineer) working at an industrial facility. Their typical day: They start their morning reviewing daily shift reports or alarms. When an anomaly is flagged on a specific piece of equipment (e.g., a pump or compressor), it is their job to investigate its history, current state, and relevant documentation to brief the maintenance team. Environment: They work primarily at a desk in an office environment, occasionally visiting the control room. They use a standard desktop or laptop with a large monitor."
currentProblem: "The specific moment of pain occurs right after an asset is flagged for review. The Analyst knows the equipment tag (e.g., \"PUMP-101\"), but to understand what is happening, they have to play \"data detective.\" The breakdown: They have to log into SAP to see open work orders, open a separate historian tool to view live sensor data, and dig through a messy SharePoint drive to find the P&ID diagram. The workaround: Because this takes 1-2 hours per asset, they often rely on outdated Excel spreadsheets, ask colleagues on Teams for \"tribal knowledge,\" or make decisions with incomplete data to save time."
oneSentenceStory: "As an Operations Analyst, I want to search for a specific piece of equipment and instantly see its connected time series data, recent work orders, and related documents in one unified view, so that I can quickly understand its status without switching between five different systems."
successCriteria: "We will know the app is working when the Operations Analyst completely abandons their old method of opening 3-4 separate siloed applications to investigate a single equipment tag. Metrics: We will see a high volume of search queries executed within the app. Success Indicator: The user successfully searches an asset, views a live time-series chart, and clicks to open an associated file (like a manual or P&ID diagram) all from the same dashboard page, reducing their investigation time from hours to minutes."
userEvidence: "Because this is a generalized Tier 1 Certification App, this need is a highly informed assumption based on aggregated historical data rather than a single direct user interview. Across dozens of real-world CDF deployments, the \"Asset 360\" pattern (unifying SAP work orders, historian data, and P&ID files) is consistently the most requested first-value use case. We are simulating this universally understood industrial pain point to ensure the certification exercise is directly relevant to what developers will actually be asked to build in the field."
reviewedSections:
  - appDetails
  - who
  - problem
  - tasksAndSuccess
---

# App Brief — Asset 360 Investigation Workspace

## App details

- **Customer:** Cognite Flows Builder Certification (publicdata / publicdatacdm)
- **Tier:** Tier 1: Monitoring & reporting
- **Owner:** Sebastian Srikanth Kumar Selvaraj <sebastian.selvaraj@cognitedata.com>
- **Expected users:**
- **Business value:**
- **Milestones:**
- **Repository:** https://github.com/sebastian-srikanth/sebastian-flow-app-certification
- **App externalId:** workspace
- **Infra:** appsApi

## Who is this app for?

This application is designed for an Operations Analyst (or Reliability Engineer) working at an industrial facility. Their typical day: They start their morning reviewing daily shift reports or alarms. When an anomaly is flagged on a specific piece of equipment (e.g., a pump or compressor), it is their job to investigate its history, current state, and relevant documentation to brief the maintenance team. Environment: They work primarily at a desk in an office environment, occasionally visiting the control room. They use a standard desktop or laptop with a large monitor.

## What problem does this solve?

The specific moment of pain occurs right after an asset is flagged for review. The Analyst knows the equipment tag (e.g., "PUMP-101"), but to understand what is happening, they have to play "data detective." The breakdown: They have to log into SAP to see open work orders, open a separate historian tool to view live sensor data, and dig through a messy SharePoint drive to find the P&ID diagram. The workaround: Because this takes 1-2 hours per asset, they often rely on outdated Excel spreadsheets, ask colleagues on Teams for "tribal knowledge," or make decisions with incomplete data to save time.

## Tasks and success

**One-sentence story.** As an Operations Analyst, I want to search for a specific piece of equipment and instantly see its connected time series data, recent work orders, and related documents in one unified view, so that I can quickly understand its status without switching between five different systems.

**Success criteria.** We will know the app is working when the Operations Analyst completely abandons their old method of opening 3-4 separate siloed applications to investigate a single equipment tag. Metrics: We will see a high volume of search queries executed within the app. Success Indicator: The user successfully searches an asset, views a live time-series chart, and clicks to open an associated file (like a manual or P&ID diagram) all from the same dashboard page, reducing their investigation time from hours to minutes.

**User evidence.** Because this is a generalized Tier 1 Certification App, this need is a highly informed assumption based on aggregated historical data rather than a single direct user interview. Across dozens of real-world CDF deployments, the "Asset 360" pattern (unifying SAP work orders, historian data, and P&ID files) is consistently the most requested first-value use case. We are simulating this universally understood industrial pain point to ensure the certification exercise is directly relevant to what developers will actually be asked to build in the field.
