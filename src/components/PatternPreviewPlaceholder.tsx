export function PatternPreviewPlaceholder() {
  return (
    <div className="lg:h-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-fadeIn flex flex-col">
      <h2 className="text-base lg:text-lg font-semibold mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600 dark:text-white flex-shrink-0">Pattern Preview</h2>
      <div className="h-[400px] sm:h-[500px] lg:flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-gray-400 dark:border-gray-500 rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 border-4 border-gray-400 dark:border-gray-500 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-gray-400 dark:border-gray-500 rounded-full"></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative inline-block mb-6">
            <svg className="w-28 h-28 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-700 dark:text-gray-200 text-base lg:text-lg font-semibold mb-2">No Pattern Loaded</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm mx-auto">
            Connect to your machine and choose a PES embroidery file to see your design preview
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
              <span>Drag to Position</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 dark:bg-green-500 rounded-full"></div>
              <span>Zoom & Pan</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 dark:bg-purple-500 rounded-full"></div>
              <span>Real-time Preview</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
