# Start from an existing Python image
# (like a pre-installed OS with Python ready)
# Use slim base instead of full to reduce image size
FROM python:3.11-slim   
    
# All following commands run inside /app folder
WORKDIR /app                 

# Install system deps needed by scikit-learn/numpy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file into the container
COPY requirements.txt .  
# Install only what's needed, no cache
RUN pip install --no-cache-dir -r requirements.txt   

 # Copy code into the container
COPY app/ ./app/     
# Copy trained model into the container       
COPY models/ ./models/       
# Tell Docker this service listens on port 8000
EXPOSE 8000                  

# The command to START the service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]