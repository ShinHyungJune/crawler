const axios = require('axios');

class Event {
    static all(then, catchError, params = {}){
        return axios.get('/api/events', {
            params: params
        }).then((response) => {
            then(response.data);
        }).catch((error) => {
            catchError(error);
        });
    }

	static latest(then, catchError, params = {}){
		return axios.get('/api/events', {
			take: 1,
			orderBy: "created_at",
			align: "desc"
		}).then((response) => {
			then(response.data);
		}).catch((error) => {
			catchError(error);
		});
	}
}
