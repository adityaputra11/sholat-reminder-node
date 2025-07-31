import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import axios from 'axios';

const url = 'https://api.myquran.com/v2/';
export class SholatReminderNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sholat Reminder',
		name: 'sholatReminderNode',
		group: ['transform'],
		version: 1,
		icon: 'file:icon-sholat.svg',
		description: 'Sholat Reminder Node is used to fetch prayer times based on location',
		defaults: {
			name: 'Sholat Reminder',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Location City',
				name: 'locationCity',
				type: 'string',
				default: '',
				placeholder: 'Jakarta',
				description: 'Location city is city name to search for prayer times',
			},
			{
				displayName: 'DateTime',
				name: 'dateTime',
				type: 'string',
				default: '2025-07-31',
				placeholder: '2025-07-31',
				description: 'Optional date in YYYY-MM-DD format to get prayer times for a specific date',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let locationCity: string;
		let dateTime: string;
		let cityId: string;
		let responsePrayTimes;
		let responseCities;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				locationCity = this.getNodeParameter('locationCity', itemIndex, '') as string;
				dateTime = this.getNodeParameter('dateTime', itemIndex, '') as string;
				item = items[itemIndex];

				const resCities = await axios.get(`${url}/sholat/kota/cari/${locationCity}`);
				responseCities = resCities?.data?.data;
				cityId = responseCities?.[0]?.id;
				if (cityId) {
					const responsePray = await axios.get(`${url}/sholat/jadwal/${cityId}/${dateTime}`);
					responsePrayTimes = responsePray.data.data;
				}

				item.json = {
					...item.json,
					locationCity,
					responseCities: responseCities,
					responsePrayTimes: responsePrayTimes,
				};
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [items];
	}
}
