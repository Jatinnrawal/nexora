pipeline {

    agent any

    environment {
        COMPOSE_PROJECT_NAME = "nexora"
    }

    options {
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out NEXORA source code...'
                checkout scm
            }
        }

        stage('Frontend Lint') {
            steps {
                echo 'Installing frontend dependencies and running lint...'

                sh '''
                    npm ci --include=dev --include=optional
                    npm run lint
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                echo 'Building frontend...'

                sh '''
                    npm run build
                '''
            }
        }

        stage('Validate Docker Compose') {
            steps {
                echo 'Validating Docker Compose configuration...'

                sh '''
                    docker compose config -q
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building NEXORA Docker images...'

                sh '''
                    docker compose build
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying NEXORA...'

                sh '''
                    docker compose up -d
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo 'Checking NEXORA services...'

                sh '''
                    sleep 5

                    echo "Checking containers..."
                    docker compose ps

                    echo "Checking backend health..."
                    curl --fail http://localhost:8000/health

                    echo "Checking frontend..."
                    curl --fail http://localhost:5173
                '''
            }
        }
    }

    post {

        success {
            echo '''
            ========================================
            NEXORA CI/CD SUCCESS
            ========================================
            Frontend : http://localhost:5173
            Backend  : http://localhost:8000
            MinIO    : http://localhost:9001
            ========================================
            '''
        }

        failure {
            echo 'NEXORA CI/CD FAILED'

            sh '''
                docker compose ps || true
                docker compose logs --tail=50 backend || true
                docker compose logs --tail=50 frontend || true
            '''
        }

        always {
            echo 'NEXORA pipeline completed.'
        }
    }
}
