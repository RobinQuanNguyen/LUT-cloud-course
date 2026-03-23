# Start from an existing Python image
# (like a pre-installed OS with Python ready)
FROM python:3.11-slim        
    
# All following commands run inside /app folder
WORKDIR /app                 

# Copy requirements file into the container
COPY requirements.txt .  
# Install all necessary Python packages    
RUN pip install --no-cache-dir -r requirements.txt    

 # Copy code into the container
COPY app/ ./app/     
# Copy trained model into the container       
COPY models/ ./models/       
# Tell Docker this service listens on port 8000
EXPOSE 8000                  

# The command to START the service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]