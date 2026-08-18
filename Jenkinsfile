pipeline {


    agent any 

 
    environment {
        COMPOSE_PROJECT_NAME = "nexora"
    }


    stages {
  
       
        stage('checkout') {
            steps {
                echo 'checking out NEXORA source code...' 

                checkout scm
            }
        }

        stage('Validate Docker Compose') {
            steps {
                 echo 'validating docker-compose.yml...'

                 sh '''
                     docker compose config -q
                 '''
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Deploying NEXORA...'

                sh '''
                    docker compose up -d
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'Checking NEXORA containers...'

                sh '''
                    sleep 5
                    docker compose ps
                '''
            }
        }
    }

    post {
     
        success {
            echo '========================================'
            echo 'NEXORA DEPLOYMENT SUCCESSFUL'
            echo '========================================'
            echo 'Frontend: http://localhost:5173'
            echo 'Backend:  http://localhost:8000'
            echo 'MinIO:    http://localhost:9001'
        }

        failure {
            echo '========================================'
            echo 'NEXORA PIPELINE FAILED'
            echo '========================================'

            sh '''
                docker compose ps || true
            '''
        }

        always {
            echo 'Jenkins pipeline finished.'
        }
    }
}

