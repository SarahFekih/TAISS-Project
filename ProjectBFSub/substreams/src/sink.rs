use std::collections::HashMap;

use substreams::errors::Error;
use substreams_antelope::Block;
use substreams_sink_prometheus::{PrometheusOperations, Gauge};
use crate::abi;

#[substreams::handlers::map]
pub fn prom_out(block: Block) -> Result<PrometheusOperations, Error> {
    let mut prom_out = PrometheusOperations::default();

    for trx in block.all_transaction_traces() {
        for trace in &trx.action_traces {
            let action_trace = trace.action.as_ref().unwrap();
            let account = &action_trace.account;

            if trace.receiver != *account { continue; }
            if account != "taissbfsubst" { continue; }

            if let Ok(setentry) = abi::Setentry::try_from(action_trace.json_data.as_str()) {
                let transmitterSig = &setentry.transmitterSig;
                let receiverSignature = &setentry.receiverSignature;
                let timestamp = &setentry.timestamp;

                let mut add_gauge_metric = |metric_name: &str, value: f64| {
                    let mut labels = HashMap::new();
                    labels.insert("transmitterSig".to_string(), transmitterSig.clone());
                    labels.insert("receiverSignature".to_string(), receiverSignature.clone());
                    labels.insert("timestamp".to_string(), timestamp.clone().to_string());
                    prom_out.push(Gauge::from(metric_name).with(labels).set(value));
                };

                // Convert String fields to f64 before passing to the closure
                if let Ok(temperature) = setentry.temperature.parse::<f64>() {
                    add_gauge_metric("temperature", temperature);
                }

                if let Ok(humidity) = setentry.humidity.parse::<f64>() {
                    add_gauge_metric("humidity", humidity);
                }

                if let Ok(ammonia) = setentry.ammoniaConcentration.parse::<f64>() {
                    add_gauge_metric("ammonia_concentration", ammonia);
                }

                if let Ok(oxygen) = setentry.dissolvedOxygen.parse::<f64>() {
                    add_gauge_metric("dissolved_oxygen", oxygen);
                }
            }
        }
    }

    Ok(prom_out)
}
