const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/CricketMatchDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace relative imports
content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/src\//g, '../');

// Replace lucide-react-native with lucide-react
content = content.replace(/lucide-react-native/g, 'lucide-react');

// Replace react-native imports (and remove them)
content = content.replace(/import \{ View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput \} from 'react-native';/g, '');

// Routing
content = content.replace(/export default function CricketMatchDashboard\(\) \{/g, `import { useNavigate } from 'react-router-dom';\nexport default function CricketMatchDashboard({ matchId }: { matchId: string }) {`);
content = content.replace(/const \{ matchId \} = useLocalSearchParams<\w+>\(\);/g, '');
content = content.replace(/const router = useRouter\(\);/g, 'const navigate = useNavigate();');
content = content.replace(/router\.back\(\)/g, 'navigate("..")');

// Tags
content = content.replace(/<View/g, '<div');
content = content.replace(/<\/View>/g, '</div>');
content = content.replace(/<Text/g, '<span');
content = content.replace(/<\/Text>/g, '</span>');
content = content.replace(/<TouchableOpacity/g, '<button type="button"');
content = content.replace(/<\/TouchableOpacity>/g, '</button>');
content = content.replace(/<ScrollView/g, '<div className="overflow-y-auto"');
content = content.replace(/<\/ScrollView>/g, '</div>');
content = content.replace(/<TextInput/g, '<input');
content = content.replace(/<\/TextInput>/g, '</input>');

// Props
content = content.replace(/ onPress=\{/g, ' onClick={');
content = content.replace(/ onChangeText=\{/g, ' onChange={(e: any) => ');
content = content.replace(/placeholderTextColor="[^"]*"/g, '');

// Make sure to add .target.value for onChange
content = content.replace(/onChange=\{\(e: any\) => setTempStriker\}/g, 'onChange={(e: any) => setTempStriker(e.target.value)}');
content = content.replace(/onChange=\{\(e: any\) => setTempNonStriker\}/g, 'onChange={(e: any) => setTempNonStriker(e.target.value)}');
content = content.replace(/onChange=\{\(e: any\) => setTempBowler\}/g, 'onChange={(e: any) => setTempBowler(e.target.value)}');

// Alert
content = content.replace(/Alert\.alert\([^,]+,\s*([^)]+)\)/g, 'window.alert($1)');

// ActivityIndicator
content = content.replace(/<ActivityIndicator[^>]*\/>/g, '<span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />');

// Modal
content = content.replace(/<Modal[^>]*>/g, '<dialog open className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 w-full h-full"> <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-sm w-full relative">');
content = content.replace(/<\/Modal>/g, '</div></dialog>');

// Some native props that are not supported on div
content = content.replace(/ activeOpacity=\{[^}]+\}/g, '');
content = content.replace(/ keyboardType="numeric"/g, ' type="number"');

fs.writeFileSync(file, content);
console.log('Done!');
