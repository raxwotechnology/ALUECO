import { Construction } from 'lucide-react';
import Card from '../components/ui/Card';

export default function ComingSoonPage({ pageName = 'This page' }) {
    return (
        <Card className="p-12 text-center">
            <Construction className="w-16 h-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
                {pageName} — Coming Soon
            </h2>
            <p className="text-gray-600 mt-2 max-w-md mx-auto">
                This module is under construction. We'll build it in the upcoming phases.
            </p>
        </Card>
    );
}