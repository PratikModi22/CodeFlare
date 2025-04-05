# CodeFlare
# ♻️ EcoRecycle - AI-Powered E-Waste Management

[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![SDG 12](https://img.shields.io/badge/UN%20SDG-12-yellowgreen)](https://sdgs.un.org/goals/goal12)

<div align="center">
  <img src="https://png.pngtree.com/png-vector/20240310/ourmid/pngtree-world-environment-day-reduce-reuse-recycle-png-image_11922214.png" width="400" alt="EcoRecycle Logo">
</div>

## 🌍 About The Project

EcoRecycle leverages Google's AI/ML technologies to combat the global e-waste crisis by:
- Automatically classifying e-waste using **AutoML Vision**
- Providing disposal instructions via **Gemini NLP**
- Locating recycling centers with **Google Maps API**
- Incentivizing recycling through a rewards system

**Aligned with UN SDGs:**  
✔ Responsible Consumption (Goal 12)  
✔ Climate Action (Goal 13)

## 🛠 Tech Stack

| Layer               | Technologies Used                                                                 |
|---------------------|-----------------------------------------------------------------------------------|
| **Frontend**        | Angular, Google Material Design                                                  |
| **Backend**         | Google Cloud Functions, Firebase (Auth/Firestore)                                |
| **Machine Learning**| AutoML Vision, Gemini API                                                        |
| **Mapping**         | Google Maps API, Geocoding API                                                   |
| **Analytics**       | BigQuery, Google Data Studio                                                     |
| **Deployment**      | Google Kubernetes Engine (GKE)                                                   |

## 🚀 Getting Started

### Prerequisites
- Google Cloud Account
- Firebase Project
- Python 3.9+

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/EcoRecycle.git

# Install dependencies
cd EcoRecycle
pip install -r requirements.txt

# Set up environment variables
echo "GOOGLE_MAPS_API_KEY=your_key" >> .env
echo "FIREBASE_CONFIG=your_config" >> .env
