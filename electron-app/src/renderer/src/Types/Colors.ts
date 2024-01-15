export const defaultInputColor = "#9e9e9e";
export const defaultInputTextColor: string = "#e8e8e8"

export interface RGBColor
{
	r: number;
	g: number;
	b: number;
}

export interface TableColorScheme
{
	primaryColor: string;
	secondaryColorOne: string;
	secondaryColorTwo: string;
}

export const PasswordsColor: TableColorScheme =
{
	primaryColor: "#FB2576",
	secondaryColorOne: "#a712ec",
	secondaryColorTwo: "#530101"
};

export const ValuesColor: TableColorScheme =
{
	primaryColor: "#3339ef",
	secondaryColorOne: "#5d0ca6",
	secondaryColorTwo: "#a712ec"
}

export interface ColorPalette
{
	id: number;
	active: boolean;
	isCreated: boolean;
	editable: boolean;
	passwordsColor: TableColorScheme;
	valuesColor: TableColorScheme;
	filtersColor: string;
	groupsColor: string;
	deleteColor: string;
	backgroundColor: string;
	tableColor: string;
	sideDrawerColor: string;
	metricDrawerColor: string;
}

export const emptyColorPalette: ColorPalette =
{
	id: -7,
	active: false,
	isCreated: false,
	editable: false,
	passwordsColor: {
		primaryColor: "",
		secondaryColorOne: "",
		secondaryColorTwo: ""
	},
	valuesColor: {
		primaryColor: "",
		secondaryColorOne: "",
		secondaryColorTwo: ""
	},
	filtersColor: "",
	groupsColor: "",
	deleteColor: '',
	backgroundColor: "#0f111d",
	tableColor: "#161e29",
	sideDrawerColor: "#161b2e",
	metricDrawerColor: "#161b2e"
}

export const colorPalettes: ColorPalette[] = [
	{
		id: -1,
		active: false,
		isCreated: true,
		editable: false,
		passwordsColor: {
			primaryColor: "#a712ec",
			secondaryColorOne: "#6612ec",
			secondaryColorTwo: "#2419bf"
		},
		valuesColor: {
			primaryColor: "#03C4A1",
			secondaryColorOne: "#03a7c4",
			secondaryColorTwo: "#03c460"
		},
		filtersColor: "#7752FE",
		groupsColor: "#19A7CE",
		deleteColor: 'red',
		backgroundColor: "#0f111d",
		tableColor: "#161e29",
		sideDrawerColor: "#0c0f16",
		metricDrawerColor: "#0f141a"
	},
	{
		id: -2,
		active: true,
		isCreated: true,
		editable: false,
		passwordsColor: {
			primaryColor: "#9A031E",
			secondaryColorOne: "#a712ec",
			secondaryColorTwo: "#530101"
		},
		valuesColor: {
			primaryColor: "#BF3131",
			secondaryColorOne: "#5d0ca6",
			secondaryColorTwo: "#a712ec"
		},
		filtersColor: "#FB8B24",
		groupsColor: "#E36414",
		deleteColor: 'red',
		backgroundColor: "#0f111d",
		tableColor: "#161e29",
		sideDrawerColor: "#0c0f16",
		metricDrawerColor: "#0f141a"
	},
	{
		id: -3,
		active: false,
		isCreated: true,
		editable: false,
		passwordsColor: {
			primaryColor: "#777777",
			secondaryColorOne: "#bbbbbb",
			secondaryColorTwo: "#111111"
		},
		valuesColor: {
			primaryColor: "#888888",
			secondaryColorOne: "#bbbbbb",
			secondaryColorTwo: "#111111"
		},
		filtersColor: "#a9b3bb",
		groupsColor: "#8e9a98",
		deleteColor: '#777272',
		backgroundColor: "#0f111d",
		tableColor: "#161e29",
		sideDrawerColor: "#0c0f16",
		metricDrawerColor: "#0f141a"
	},
	{
		id: -4,
		active: false,
		isCreated: false,
		editable: false,
		passwordsColor: {
			primaryColor: "",
			secondaryColorOne: "",
			secondaryColorTwo: ""
		},
		valuesColor: {
			primaryColor: "",
			secondaryColorOne: "",
			secondaryColorTwo: ""
		},
		filtersColor: "",
		groupsColor: "",
		deleteColor: '',
		backgroundColor: "#0f111d",
		tableColor: "#161e29",
		sideDrawerColor: "#0c0f16",
		metricDrawerColor: "#0f141a"
	},
	{
		id: -5,
		active: false,
		isCreated: false,
		editable: false,
		passwordsColor: {
			primaryColor: "",
			secondaryColorOne: "",
			secondaryColorTwo: ""
		},
		valuesColor: {
			primaryColor: "",
			secondaryColorOne: "",
			secondaryColorTwo: ""
		},
		filtersColor: "",
		groupsColor: "",
		deleteColor: '',
		backgroundColor: "#0f111d",
		tableColor: "#161e29",
		sideDrawerColor: "#0c0f16",
		metricDrawerColor: "#0f141a"
	},
	{
		id: -6,
		active: false,
		isCreated: false,
		editable: false,
		passwordsColor: {
			primaryColor: "",
			secondaryColorOne: "",
			secondaryColorTwo: ""
		},
		valuesColor: {
			primaryColor: "",
			secondaryColorOne: "",
			secondaryColorTwo: ""
		},
		filtersColor: "",
		groupsColor: "",
		deleteColor: '',
		backgroundColor: "#0f111d",
		tableColor: "#161e29",
		sideDrawerColor: "#0c0f16",
		metricDrawerColor: "#0f141a"
	}
];
