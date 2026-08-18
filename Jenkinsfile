pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

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
                echo 'Checking Jenkins environment...'

                sh '''
                    echo "Node version:"
                    node -v

                    echo "NPM version:"
                    npm -v

                    echo "Node location:"
                    which node

                    echo "NPM location:"
                    which npm

                    echo "System:"
                    uname -m

                    echo "Operating System:"
                    uname -a
                '''
            }
        }

        stage('Frontend Dependencies') {
            steps {
                echo 'Installing frontend dependencies...'

                sh '''
                    rm -rf node_modules package-lock.json

                    npm install --include=dev --include=optional

                    echo "Installing Linux native bindings..."

                    npm install --no-save @oxlint/binding-linux-x64-gnu@1.78.0

                    ROLLDOWN_VERSION=$(node -p "require('rolldown/package.json').version")

                    echo "Detected Rolldown version: $ROLLDOWN_VERSION"

                    npm install --no-save @rolldown/binding-linux-x64-gnu@$ROLLDOWN_VERSION

                    echo "Checking Oxlint:"
                    ls -lah node_modules/@oxlint/ 2>/dev/null || true

                    echo "Checking Rolldown:"
                    ls -lah node_modules/@rolldown/ 2>/dev/null || true

                    echo "Dependencies ready."
                '''
            }
        }

        stage('Frontend Lint') {
            steps {
                echo 'Running frontend lint...'

                sh '''
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

                    echo "Container Status"
                    docker compose ps

                    echo ""
                    echo "Backend Health"
                    curl --fail http://localhost:8000/health

                    echo ""
                    echo "Frontend Health"
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
Backend: http://localhost:8000
MinIO: http://localhost:9001

Pipeline completed successfully.
'''
        }

        failure {
            echo '''
NEXORA CI/CD FAILED

Collecting container logs...
'''

            sh '''
                echo "Container status:"
                docker compose ps || true

                echo ""
                echo "Backend logs:"
                docker compose logs --tail=50 backend || true

                echo ""
                echo "Frontend logs:"
                docker compose logs --tail=50 frontend || true
            '''
        }

        always {
            echo 'NEXORA Jenkins pipeline completed.'
        }
    }
}
