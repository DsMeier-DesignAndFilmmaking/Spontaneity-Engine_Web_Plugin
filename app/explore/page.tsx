"use client";

import SpontaneityWidget from "../components/SpontaneityWidget";

export default function ExplorePage() {
  // For demo/explore page, show the widget button
  // In production, this would be embedded in client apps
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pt-24 md:pt-28">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Spontaneity Events Platform
        </h1>
        <p className="text-gray-600 mb-8">
          Click the button below to see the embeddable widget in action.
          This button can be integrated into any web or mobile app.
        </p>
        
        {/* Widget Button - Demo */}
        <div className="mb-8">
          <SpontaneityWidget
            apiKey="demo-key-1"
            buttonText="Feeling Spontaneous?"
            className="mx-auto"
          />
        </div>

        {/* Integration Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6 text-left">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Integration Instructions
          </h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong className="text-gray-900">For Web Apps:</strong>
              <pre className="mt-2 p-3 bg-gray-100 rounded overflow-x-auto text-xs">
{`<script src="https://your-domain.com/widget.js"></script>
<button 
  onclick="SpontaneityWidget.open({ apiKey: 'your-api-key' })"
  class="spontaneity-button"
>
  Discover Events
</button>`}
              </pre>
            </div>
            <div>
              <strong className="text-gray-900">For React Apps:</strong>
              <pre className="mt-2 p-3 bg-gray-100 rounded overflow-x-auto text-xs">
{`import SpontaneityWidget from '@spontaneity/widget';

<SpontaneityWidget 
  apiKey="your-api-key"
  buttonText="Discover Events"
/>`}
              </pre>
            </div>
            <div>
              <strong className="text-gray-900">For Mobile Apps:</strong>
              <p className="mt-1">
                Use the native SDKs (iOS/Android) or open the widget in a WebView.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
