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

        stage('Environment Check') {
            steps {
                echo 'Checking Jenkins Node/npm environment...'

                sh '''
                    echo "Node version:"
                    node -v

                    echo "NPM version:"
                    npm -v

                    echo "System:"
                    uname -a
                    uname -m

                    echo "NPM omit config:"
                    npm config get omit

                    echo "NPM include config:"
                    npm config get include

                    echo "Oxlint:"
                    npm ls oxlint || true

                    echo "Oxlint bindings:"
                    ls -lah node_modules/@oxlint/ || true

                    echo "Linux Oxlint binding:"
                    ls -lah node_modules/@oxlint/binding-linux-x64-gnu/ || true
                '''
            }
        }

        stage('Frontend Lint') {
            steps {
                echo 'Installing frontend dependencies and running lint...'

                sh '''
                    npm ci --include=dev --include=optional

                    echo "Checking Oxlint native binding:"
                    ls -lah node_modules/@oxlint/ || true

                    npm run lint
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                echo 'Building NEXORA frontend...'

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

                    echo "Container status:"
                    docker compose ps

                    echo "Backend health:"
                    curl --fail http://localhost:8000/health

                    echo ""
                    echo "Frontend health:"
                    curl --fail http://localhost:5173

                    echo ""
                    echo "Health checks passed."
                '''
            }
        }
    }

    post {

        success {
            echo '''
NEXORA CI/CD SUCCESS

Frontend: http://localhost:5173
Backend:  http://localhost:8000
MinIO:    http://localhost:9001

Pipeline completed successfully.
'''
        }

        failure {
            echo '''
NEXORA CI/CD FAILED

Collecting container logs...
'''

            sh '''
                docker compose ps || true

                echo "Backend logs:"
                docker compose logs --tail=50 backend || true

                echo "Frontend logs:"
                docker compose logs --tail=50 frontend || true
            '''
        }

        always {
            echo 'NEXORA Jenkins pipeline completed.'
        }
    }
}
