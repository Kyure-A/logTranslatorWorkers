import { getTranslationText } from "lingva-scraper";

export default {
	async fetch(
		request: Request,
	): Promise<Response> {
		const { searchParams } = new URL(request.url);
		const translateQuery: string | null = searchParams.get("text");

		if (translateQuery === null) {
			return Response.json({
				code: 400,
				text: "bad request"
			})
		}
		
		const translated = await getTranslationText("en", "ja", translateQuery);

		return Response.json({
			code: 200,
			text: translated
		})
	},
};
