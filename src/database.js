
import _ from 'lodash';
import modelFactory from './model';

export default function(config) {
    return {
        _archimedesDatabase: true,
        config: config,
        // name: config.name,

        register(models) {
            this.modelSchemas = models;
            _.forOwn(models, (ModelConfig, name) => {
                this[name] = modelFactory(this, name, ModelConfig);
            });
        },

        sync(modelType, modelInstanceOrPojo) {
            console.log('saving', modelInstanceOrPojo.attrs);
            modelInstanceOrPojo._id = 3;
        },

        delete(modelType, modelInstanceOrId) {
            console.log('deleting', modelInstanceOrId._id);
        },

        count(modelType, query, options) {
            console.log('querying', modelType, query, options);
        }
    };
}