export const getThemeColors = () => {
    const isGreenTheme = process.env.NEXT_PUBLIC_BAZNAS_THEME === 'true';

    return {
        primary: isGreenTheme ? 'green' : 'blue',
        primaryLight: isGreenTheme ? '[#65FFC1]' : 'blue-400',      // Green 300
        primaryMedium: isGreenTheme ? '[#00D066]' : 'blue-500',     // Green 600  
        primaryDark: isGreenTheme ? '[#00A253]' : 'blue-600',       // Green 700
        primaryDarker: isGreenTheme ? '[#005331]' : 'blue-900',     // Green 900
        primaryGradientFrom: isGreenTheme ? 'from-[#00D066]' : 'from-blue-500',
        primaryGradientTo: isGreenTheme ? 'to-[#00A253]' : 'to-purple-600',
        textPrimary: isGreenTheme ? 'text-[#00A253]' : 'text-blue-600',
        bgPrimary: isGreenTheme ? 'bg-[#00D066]' : 'bg-blue-500',
        bgPrimaryDarker: isGreenTheme ? 'bg-[#005331]' : 'bg-blue-900',
        borderPrimary: isGreenTheme ? 'border-[#00D066]' : 'border-primary',
        hoverBgPrimary: isGreenTheme ? 'hover:bg-[#A8FFDB]' : 'hover:bg-blue-200', // Green 200
        hoverTextPrimary: isGreenTheme ? 'hover:text-[#007E46]' : 'hover:text-blue-700' // Green 800
    };
};