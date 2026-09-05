import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900">404</h1>
                <p className="text-lg text-gray-600 mt-2">Page not found</p>
                <Link to="/dashboard">
                    <Button variant="primary" className="mt-6">
                        Go to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
}