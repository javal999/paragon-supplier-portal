// Paradise 0.2.0-alpha.6 adapter for lucide-react (stage 5b, Icons).
//
// The app imports icons from "lucide-react" in many files. The Vite and Vitest
// configs point that one module name here, so no call site changes. Icons with
// a Paradise glyph of the same meaning render the Paradise glyph; every other
// icon is re-exported from lucide-react unchanged (listed as gaps in the plan).
//
// To remove: delete the "lucide-react" alias from vite.config.js and
// vitest.config.js, then delete this file.
import Icon from '../icons/Icon.jsx';

export * from 'lucide-react/dist/esm/lucide-react.mjs';

const make = (exportName, lucideClass, paradiseName) => {
  const cls = `lucide ${lucideClass}`;
  /** @param {any} props */
  const C = ({ size = 24, color, strokeWidth, absoluteStrokeWidth, className, style, ...rest }) => {
    const labelled = rest['aria-label'] || rest['aria-labelledby'] || rest.title;
    return (
      <Icon
        name={paradiseName}
        size={size}
        className={className ? `${cls} ${className}` : cls}
        style={color ? { color, ...style } : style}
        aria-hidden={labelled ? undefined : 'true'}
        {...rest}
      />
    );
  };
  C.displayName = exportName;
  return C;
};

export const AlertTriangle = make('AlertTriangle', 'lucide-triangle-alert', 'WarningOutlineIcon');
export const CheckCircle2 = make('CheckCircle2', 'lucide-circle-check', 'CheckOutlineIcon');
export const Send = make('Send', 'lucide-send', 'SendIcon');
export const Info = make('Info', 'lucide-info', 'InfoOutlineIcon');
export const X = make('X', 'lucide-x', 'CloseIcon');
export const Clock = make('Clock', 'lucide-clock', 'TimeOutlineIcon');
export const Plus = make('Plus', 'lucide-plus', 'PlusIcon');
export const ChevronRight = make('ChevronRight', 'lucide-chevron-right', 'ChevronRightIcon');
export const ChevronDown = make('ChevronDown', 'lucide-chevron-down', 'ChevronDownIcon');
export const FileText = make('FileText', 'lucide-file-text', 'FileIcon');
export const Download = make('Download', 'lucide-download', 'DownloadIcon');
export const Truck = make('Truck', 'lucide-truck', 'DeliveryIcon');
export const FileSpreadsheet = make('FileSpreadsheet', 'lucide-file-spreadsheet', 'ExcelFileOutlineIcon');
export const Lock = make('Lock', 'lucide-lock', 'LockOutlineIcon');
export const RefreshCw = make('RefreshCw', 'lucide-refresh-cw', 'RefreshIcon');
export const Upload = make('Upload', 'lucide-upload', 'UploadIcon');
export const ChevronUp = make('ChevronUp', 'lucide-chevron-up', 'ChevronUpIcon');
export const RotateCcw = make('RotateCcw', 'lucide-rotate-ccw', 'UndoIcon');
export const Check = make('Check', 'lucide-check', 'CheckIcon');
export const ShoppingCart = make('ShoppingCart', 'lucide-shopping-cart', 'TroliOutlineIcon');
// ClipboardCheck (Order summary) is kept as lucide by request (2026-10-19).
export const ExternalLink = make('ExternalLink', 'lucide-external-link', 'NewTabOutlineIcon');
export const ArrowRight = make('ArrowRight', 'lucide-arrow-right', 'ArrowRightIcon');
export const BellRing = make('BellRing', 'lucide-bell-ring', 'RemindBellOutlineIcon');
export const Building2 = make('Building2', 'lucide-building2 lucide-building-2', 'CompanyIcon');
export const XCircle = make('XCircle', 'lucide-circle-x', 'CloseOutlineIcon');
export const Minus = make('Minus', 'lucide-minus', 'MinusIcon');
export const ClipboardList = make('ClipboardList', 'lucide-clipboard-list', 'CheckListIcon');
export const SlidersHorizontal = make('SlidersHorizontal', 'lucide-sliders-horizontal', 'FilterOutlineIcon');
export const CalendarDays = make('CalendarDays', 'lucide-calendar-days', 'CalendarOutlineIcon');
export const Layers = make('Layers', 'lucide-layers', 'LayersIcon');
export const Search = make('Search', 'lucide-search', 'SearchOutlineIcon');
export const Bell = make('Bell', 'lucide-bell', 'RemindBellOutlineIcon');
export const Trash2 = make('Trash2', 'lucide-trash2 lucide-trash-2', 'DeleteOutlineIcon');
export const ChevronLeft = make('ChevronLeft', 'lucide-chevron-left', 'ChevronLeftIcon');
export const AlertOctagon = make('AlertOctagon', 'lucide-octagon-alert', 'HazardOutlineIcon');
export const Package = make('Package', 'lucide-package', 'BoxIcon');
export const Eye = make('Eye', 'lucide-eye', 'EyeOpenOutlineIcon');
export const ArrowLeft = make('ArrowLeft', 'lucide-arrow-left', 'ArrowLeftIcon');
export const ListChecks = make('ListChecks', 'lucide-list-checks', 'CheckListIcon');
export const Tags = make('Tags', 'lucide-tags', 'TagOneIcon');
export const Maximize2 = make('Maximize2', 'lucide-maximize2 lucide-maximize-2', 'FullScreenIcon');
export const User = make('User', 'lucide-user', 'UserOutlineIcon');
export const UploadCloud = make('UploadCloud', 'lucide-cloud-upload', 'UploadIcon');
export const PenLine = make('PenLine', 'lucide-pen-line', 'EditOutlineIcon');
export const Archive = make('Archive', 'lucide-archive', 'ArchiveIcon');
export const MapPin = make('MapPin', 'lucide-map-pin', 'LocationOutlineIcon');
export const UserPlus = make('UserPlus', 'lucide-user-plus', 'AddUserIcon');
export const LockKeyhole = make('LockKeyhole', 'lucide-lock-keyhole', 'LockOutlineIcon');
export const ListTodo = make('ListTodo', 'lucide-list-todo', 'CheckListIcon');
export const Menu = make('Menu', 'lucide-menu', 'HamburgerMenuIcon');
export const Paperclip = make('Paperclip', 'lucide-paperclip', 'PaperClipIcon');
export const Calendar = make('Calendar', 'lucide-calendar', 'CalendarOutlineIcon');
export const FileCheck2 = make('FileCheck2', 'lucide-file-check-corner', 'FileSuccessIcon');
export const ArrowDown = make('ArrowDown', 'lucide-arrow-down', 'ArrowDownIcon');
export const ArrowUp = make('ArrowUp', 'lucide-arrow-up', 'ArrowUpIcon');
export const ArrowLeftRight = make('ArrowLeftRight', 'lucide-arrow-left-right', 'SwitchIcon');
export const Pencil = make('Pencil', 'lucide-pencil', 'EditOutlineIcon');
export const Settings = make('Settings', 'lucide-settings', 'SettingOutlineIcon');
export const PenSquare = make('PenSquare', 'lucide-square-pen', 'EditOutlineIcon');
export const HelpCircle = make('HelpCircle', 'lucide-circle-question-mark', 'HelpOutlineIcon');
export const PencilLine = make('PencilLine', 'lucide-pencil-line', 'EditOutlineIcon');
export const EyeOff = make('EyeOff', 'lucide-eye-off', 'EyeCloseIcon');
export const Edit3 = make('Edit3', 'lucide-pen-line', 'EditOutlineIcon');
export const History = make('History', 'lucide-history', 'HistoryIcon');
